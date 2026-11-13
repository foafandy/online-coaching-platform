"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { dropOtherSessions, hashPassword, requireClient, verifyPassword } from "@/lib/auth";
import { getDb, STORAGE_DIR } from "@/lib/db";
import type { ActionState } from "./admin";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export async function markNotificationsReadAction() {
  const { user } = await requireClient();
  getDb().prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, profile } = await requireClient();

  const schema = z.object({
    full_name: z.string().trim().min(2, "الاسم قصير جدًا").max(80, "يجب ألا يتجاوز الاسم 80 حرفًا."),
    phone: z.string().trim().max(40, "يجب ألا يتجاوز رقم الهاتف 40 حرفًا.").optional(),
    country: z.string().trim().max(100, "اسم الدولة طويل جدًا.").optional(),
    goal: z.string().trim().max(300, "يجب ألا يتجاوز الهدف 300 حرف.").optional(),
  });

  const parsed = schema.safeParse({
    full_name: str(formData, "full_name"),
    phone: str(formData, "phone"),
    country: str(formData, "country"),
    goal: str(formData, "goal"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "يرجى مراجعة النموذج." };
  }

  getDb()
    .prepare(
      `UPDATE client_profiles SET full_name = ?, phone = ?, country = ?, goal = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      parsed.data.full_name,
      parsed.data.phone || null,
      parsed.data.country || null,
      parsed.data.goal || null,
      profile.id,
    );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  if (user.role === "client") revalidatePath("/admin/clients");
  return { success: "تم تحديث الملف الشخصي." };
}

export async function uploadAvatarAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, profile } = await requireClient();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "اختر صورة أولًا." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "استخدم صورة بصيغة JPG أو PNG أو WEBP." };
  }
  if (file.size > 5 * 1024 * 1024) return { error: "يجب ألا يتجاوز حجم الصورة 5 ميجابايت." };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const stored = `${randomUUID()}.${ext}`;
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(path.join(STORAGE_DIR, stored), Buffer.from(await file.arrayBuffer()));

  const db = getDb();
  db.prepare(
    "UPDATE client_profiles SET avatar_path = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(stored, profile.id);

  if (profile.avatar_path) {
    await fs.rm(path.join(STORAGE_DIR, profile.avatar_path), { force: true });
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  revalidatePath(`/admin/clients/${profile.id}`);
  void user;
  return { success: "تم تحديث الصورة." };
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireClient();
  const current = str(formData, "current_password");
  const next = str(formData, "new_password");
  const confirm = str(formData, "confirm_password");

  if (next.length < 8) return { error: "يجب ألا تقل كلمة المرور الجديدة عن 8 أحرف." };
  if (next !== confirm) return { error: "كلمتا المرور الجديدتان غير متطابقتين." };

  const db = getDb();
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as
    | { password_hash: string }
    | undefined;
  if (!row) return { error: "لم يتم العثور على الحساب." };
  if (!verifyPassword(current, row.password_hash)) {
    return { error: "كلمة المرور الحالية غير صحيحة." };
  }

  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
    hashPassword(next),
    user.id,
  );
  // Keep this browser signed in and revoke sessions on other devices.
  await dropOtherSessions(user.id);
  return { success: "تم تغيير كلمة المرور." };
}
