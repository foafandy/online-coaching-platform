import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { canViewWorkoutPlan, getSessionUser } from "@/lib/auth";
import { getDb, STORAGE_DIR } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ exerciseId: string }> },
) {
  const session = await getSessionUser();
  if (!session) return new Response("غير مصرح", { status: 401 });

  const { exerciseId } = await params;
  const exercise = getDb()
    .prepare(
      `SELECT e.video_stored_name, e.video_mime_type, e.video_original_name, d.plan_id
       FROM exercises e JOIN workout_days d ON d.id = e.day_id
       WHERE e.id = ?`,
    )
    .get(exerciseId) as
    | {
        video_stored_name: string | null;
        video_mime_type: string | null;
        video_original_name: string | null;
        plan_id: string;
      }
    | undefined;
  if (!exercise?.video_stored_name || !exercise.video_mime_type) {
    return new Response("غير موجود", { status: 404 });
  }
  if (!canViewWorkoutPlan(session, exercise.plan_id)) {
    return new Response("ممنوع", { status: 403 });
  }

  const safeName = path.basename(exercise.video_stored_name);
  if (safeName !== exercise.video_stored_name || !safeName.startsWith("exercise-")) {
    return new Response("غير موجود", { status: 404 });
  }

  const filePath = path.join(STORAGE_DIR, safeName);
  try {
    const stat = await fs.stat(filePath);
    const range = request.headers.get("range");
    const rangeMatch = range?.match(/^bytes=(\d*)-(\d*)$/);
    if (rangeMatch) {
      const start = rangeMatch[1] ? Number(rangeMatch[1]) : 0;
      const requestedEnd = rangeMatch[2] ? Number(rangeMatch[2]) : stat.size - 1;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(requestedEnd) ||
        start < 0 ||
        start >= stat.size ||
        requestedEnd < start
      ) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${stat.size}` },
        });
      }
      const end = Math.min(requestedEnd, stat.size - 1);
      return new Response(
        Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream,
        {
          status: 206,
          headers: {
            "Content-Type": exercise.video_mime_type,
            "Content-Length": String(end - start + 1),
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
              exercise.video_original_name ?? "exercise-video",
            )}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }

    return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
      headers: {
        "Content-Type": exercise.video_mime_type,
        "Content-Length": String(stat.size),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
          exercise.video_original_name ?? "exercise-video",
        )}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("الفيديو لم يعد متاحًا", { status: 410 });
    }
    throw error;
  }
}
