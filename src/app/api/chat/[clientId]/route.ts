import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { canAccessClientChat, getSessionUser } from "@/lib/auth";
import { createNotification } from "@/lib/data";
import { getDb, STORAGE_DIR } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const ALLOWED_ATTACHMENTS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function messageQuery() {
  return `SELECT m.id, m.client_id, m.sender_user_id, m.body, m.attachment_original_name,
                 m.attachment_mime_type, m.attachment_size_bytes, m.created_at,
                 u.role AS sender_role,
                 CASE WHEN u.role = 'client' THEN cp.full_name
                      ELSE COALESCE(u.display_name, 'فريق التدريب') END AS sender_name
          FROM chat_messages m
          JOIN users u ON u.id = m.sender_user_id
          LEFT JOIN client_profiles cp ON cp.user_id = u.id`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "غير مصرح." }, { status: 401 });

  const { clientId } = await params;
  if (!canAccessClientChat(session, clientId)) {
    return Response.json({ error: "غير مسموح." }, { status: 403 });
  }

  const url = new URL(request.url);
  const after = Number(url.searchParams.get("after"));
  const before = Number(url.searchParams.get("before"));
  const db = getDb();

  if (url.searchParams.has("after") && Number.isSafeInteger(after) && after >= 0) {
    const messages = db
      .prepare(`${messageQuery()} WHERE m.client_id = ? AND m.id > ? ORDER BY m.id ASC LIMIT 100`)
      .all(clientId, after);
    return Response.json({ messages, hasMore: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const cursor = Number.isSafeInteger(before) && before > 0 ? before : null;
  const rows = cursor
    ? db
        .prepare(
          `${messageQuery()} WHERE m.client_id = ? AND m.id < ? ORDER BY m.id DESC LIMIT 51`,
        )
        .all(clientId, cursor)
    : db
        .prepare(`${messageQuery()} WHERE m.client_id = ? ORDER BY m.id DESC LIMIT 51`)
        .all(clientId);

  const hasMore = rows.length > 50;
  const messages = rows.slice(0, 50).reverse();
  return Response.json({ messages, hasMore }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "غير مصرح." }, { status: 401 });

  const { clientId } = await params;
  if (!canAccessClientChat(session, clientId)) {
    return Response.json({ error: "غير مسموح." }, { status: 403 });
  }

  const db = getDb();
  const client = db
    .prepare("SELECT user_id, full_name FROM client_profiles WHERE id = ?")
    .get(clientId) as { user_id: string; full_name: string } | undefined;
  if (!client) return Response.json({ error: "لم يتم العثور على المتدرب." }, { status: 404 });

  const formData = await request.formData();
  const body = String(formData.get("message") ?? "").trim();
  const attachment = formData.get("attachment");
  const file = attachment instanceof File && attachment.size > 0 ? attachment : null;

  if (body.length > 5000) {
    return Response.json({ error: "يجب ألا تتجاوز الرسالة 5000 حرف." }, { status: 400 });
  }
  if (!body && !file) {
    return Response.json({ error: "اكتب رسالة أو أرفق ملفًا." }, { status: 400 });
  }
  if (file && file.size > MAX_ATTACHMENT_BYTES) {
    return Response.json({ error: "يجب ألا يتجاوز حجم المرفق 20 ميجابايت." }, { status: 400 });
  }
  const extension = file ? ALLOWED_ATTACHMENTS[file.type] : undefined;
  if (file && !extension) {
    return Response.json({ error: "نوع الملف غير مدعوم. أرفق صورة أو PDF أو TXT أو CSV أو DOCX." }, { status: 400 });
  }

  let storedName: string | null = null;
  if (file && extension) {
    storedName = `chat-${randomUUID()}.${extension}`;
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    await fs.writeFile(path.join(STORAGE_DIR, storedName), Buffer.from(await file.arrayBuffer()), {
      flag: "wx",
    });
  }

  let messageId: number;
  try {
    const result = db
      .prepare(
        `INSERT INTO chat_messages (
           client_id, sender_user_id, body, attachment_stored_name,
           attachment_original_name, attachment_mime_type, attachment_size_bytes
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        clientId,
        session.user.id,
        body || null,
        storedName,
        file?.name ?? null,
        file?.type ?? null,
        file?.size ?? null,
      );
    messageId = Number(result.lastInsertRowid);
  } catch (error) {
    if (storedName) await fs.rm(path.join(STORAGE_DIR, storedName), { force: true });
    throw error;
  }

  if (session.user.role === "client") {
    const manager = db
      .prepare("SELECT manager_user_id FROM client_manager_assignments WHERE client_id = ?")
      .get(clientId) as { manager_user_id: string } | undefined;
    if (manager) {
      createNotification({
        userId: manager.manager_user_id,
        title: `رسالة جديدة من ${client.full_name}`,
        body: body || "أرسل مرفقًا.",
        type: "chat",
        link: `/admin/clients/${clientId}/chat`,
      });
    }
  } else {
    createNotification({
      userId: client.user_id,
      title: "رسالة جديدة من مدربك",
      body: body || "أرسل مدربك مرفقًا.",
      type: "chat",
      link: "/dashboard/chat",
    });
  }

  return Response.json({ id: messageId }, { status: 201 });
}
