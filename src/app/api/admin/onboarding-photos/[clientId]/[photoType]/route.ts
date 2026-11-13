import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { canManageClient, requireClientManager } from "@/lib/auth";
import { getDb, STORAGE_DIR } from "@/lib/db";

export const dynamic = "force-dynamic";

const PHOTO_COLUMNS = {
  front: "photo_front",
  side: "photo_side",
  back: "photo_back",
} as const;

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string; photoType: string }> },
) {
  const session = await requireClientManager();

  const { clientId, photoType } = await params;
  if (!canManageClient(session.user.id, session.user.admin_scope, clientId)) {
    return new Response("ممنوع", { status: 403 });
  }
  if (!Object.hasOwn(PHOTO_COLUMNS, photoType)) return new Response("غير موجود", { status: 404 });
  const column = PHOTO_COLUMNS[photoType as keyof typeof PHOTO_COLUMNS];
  const row = getDb()
    .prepare(`SELECT ${column} AS stored_name FROM client_onboarding WHERE client_id = ?`)
    .get(clientId) as { stored_name: string } | undefined;
  if (!row) return new Response("غير موجود", { status: 404 });

  const safeName = path.basename(row.stored_name);
  if (safeName !== row.stored_name || !safeName.startsWith("onboarding-")) {
    return new Response("غير موجود", { status: 404 });
  }
  const extension = path.extname(safeName).slice(1);
  const mimeType = MIME_TYPES[extension];
  if (!mimeType) return new Response("غير موجود", { status: 404 });
  const filePath = path.join(STORAGE_DIR, safeName);

  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("الصورة لم تعد متاحة", { status: 410 });
    }
    throw error;
  }

  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(stat.size),
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
