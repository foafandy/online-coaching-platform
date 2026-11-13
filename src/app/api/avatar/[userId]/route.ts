import fs from "node:fs/promises";
import path from "node:path";
import { canManageClient, getSessionUser } from "@/lib/auth";
import { STORAGE_DIR } from "@/lib/db";
import { getClientByUserId } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSessionUser();
  if (!session) return new Response("غير مصرح", { status: 401 });

  const { userId } = await params;
  if (session.user.role !== "admin" && session.user.id !== userId) {
    return new Response("ممنوع", { status: 403 });
  }

  const profile = getClientByUserId(userId);
  if (
    session.user.role === "admin" &&
    session.user.admin_scope === "clients" &&
    (!profile || !canManageClient(session.user.id, session.user.admin_scope, profile.id))
  ) {
    return new Response("ممنوع", { status: 403 });
  }
  if (!profile?.avatar_path) return new Response("غير موجود", { status: 404 });

  const filePath = path.join(STORAGE_DIR, path.basename(profile.avatar_path));
  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("غير موجود", { status: 404 });
  }
}
