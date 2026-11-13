import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getSessionUser } from "@/lib/auth";
import { STORAGE_DIR } from "@/lib/db";
import { clientCanAccessFile, getFile, managerCanAccessFile } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return new Response("غير مصرح", { status: 401 });
  }

  const { fileId } = await params;
  const file = getFile(fileId);
  if (!file) {
    return new Response("غير موجود", { status: 404 });
  }

  // Server-side permission check: clients may only open files assigned to them.
  if (
    (session.user.role === "client" && !clientCanAccessFile(session.user.id, fileId)) ||
    (session.user.role === "admin" &&
      session.user.admin_scope === "clients" &&
      !managerCanAccessFile(session.user.id, fileId))
  ) {
    return new Response("ممنوع", { status: 403 });
  }

  const safeName = path.basename(file.stored_name);
  const filePath = path.join(STORAGE_DIR, safeName);

  try {
    await fs.access(filePath);
  } catch {
    return new Response("الملف لم يعد متاحًا", { status: 410 });
  }

  const url = new URL(request.url);
  const forceDownload = url.searchParams.get("download") === "1";
  const inline = !forceDownload && /^(image\/|application\/pdf|video\/mp4|text\/)/.test(file.mime_type);

  const stat = await fs.stat(filePath);
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new Response(stream, {
    headers: {
      "Content-Type": file.mime_type,
      "Content-Length": String(stat.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(
        file.original_name,
      )}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
