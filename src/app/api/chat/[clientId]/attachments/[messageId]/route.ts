import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { canAccessClientChat, getSessionUser } from "@/lib/auth";
import { getDb, STORAGE_DIR } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string; messageId: string }> },
) {
  const session = await getSessionUser();
  if (!session) return new Response("غير مصرح", { status: 401 });

  const { clientId, messageId } = await params;
  if (!canAccessClientChat(session, clientId)) return new Response("ممنوع", { status: 403 });

  const row = getDb()
    .prepare(
      `SELECT attachment_stored_name, attachment_original_name, attachment_mime_type
       FROM chat_messages WHERE id = ? AND client_id = ?`,
    )
    .get(messageId, clientId) as
    | {
        attachment_stored_name: string | null;
        attachment_original_name: string | null;
        attachment_mime_type: string | null;
      }
    | undefined;
  if (!row?.attachment_stored_name || !row.attachment_mime_type) {
    return new Response("غير موجود", { status: 404 });
  }

  const safeName = path.basename(row.attachment_stored_name);
  if (safeName !== row.attachment_stored_name || !safeName.startsWith("chat-")) {
    return new Response("غير موجود", { status: 404 });
  }

  const filePath = path.join(STORAGE_DIR, safeName);
  try {
    const stat = await fs.stat(filePath);
    return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
      headers: {
        "Content-Type": row.attachment_mime_type,
        "Content-Length": String(stat.size),
        "Content-Disposition": `${
          row.attachment_mime_type.startsWith("image/") ? "inline" : "attachment"
        }; filename*=UTF-8''${encodeURIComponent(row.attachment_original_name ?? "attachment")}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("المرفق لم يعد متاحًا", { status: 410 });
    }
    throw error;
  }
}
