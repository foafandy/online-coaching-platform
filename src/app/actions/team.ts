"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export type TeamActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

export async function createClientManagerAction(
  _previous: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  await requireAdmin();
  const parsed = z
    .object({
      display_name: z.string().trim().min(2, "أدخل اسم الموظف").max(80, "الاسم طويل جدًا."),
      email: z.string().trim().toLowerCase().email("أدخل بريدًا إلكترونيًا صحيحًا"),
      password: z.string().min(10, "كلمة المرور يجب ألا تقل عن 10 أحرف").max(200, "كلمة المرور طويلة جدًا."),
    })
    .safeParse({
      display_name: formData.get("display_name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { error: "يرجى مراجعة البيانات المدخلة.", fieldErrors };
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(parsed.data.email);
  if (existing) return { error: "يوجد حساب مسجل بهذا البريد الإلكتروني." };

  db.prepare(
    `INSERT INTO users (id, email, password_hash, role, admin_scope, display_name)
     VALUES (?, ?, ?, 'admin', 'clients', ?)`,
  ).run(
    randomUUID(),
    parsed.data.email,
    hashPassword(parsed.data.password),
    parsed.data.display_name,
  );

  revalidatePath("/admin/team");
  return { success: "تم إنشاء حساب مسؤول إدارة العملاء. أرسل له البريد وكلمة المرور الأولية." };
}

export async function deleteClientManagerAction(formData: FormData) {
  const session = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  if (!userId || userId === session.user.id) return;

  const db = getDb();
  db.prepare(
    "DELETE FROM users WHERE id = ? AND role = 'admin' AND admin_scope = 'clients'",
  ).run(userId);
  revalidatePath("/admin/team");
}

export async function saveClientManagerAssignmentsAction(formData: FormData) {
  const session = await requireAdmin();
  const managerId = String(formData.get("user_id") ?? "").trim();
  if (!managerId) throw new Error("حساب مسؤول العملاء غير صالح.");

  const db = getDb();
  const manager = db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'admin' AND admin_scope = 'clients'")
    .get(managerId);
  if (!manager) throw new Error("لم يتم العثور على حساب مسؤول العملاء.");

  const clientIds = [...new Set(formData.getAll("client_ids").map(String).filter(Boolean))];
  if (clientIds.length) {
    const placeholders = clientIds.map(() => "?").join(", ");
    const clients = db
      .prepare(`SELECT id FROM client_profiles WHERE id IN (${placeholders})`)
      .all(...clientIds) as Array<{ id: string }>;
    if (clients.length !== clientIds.length) {
      throw new Error("تضمّن الاختيار عميلًا غير صالح.");
    }
  }

  db.transaction(() => {
    db.prepare("DELETE FROM client_manager_assignments WHERE manager_user_id = ?").run(managerId);
    const removePreviousManagers = db.prepare(
      "DELETE FROM client_manager_assignments WHERE client_id = ?",
    );
    const insert = db.prepare(
      `INSERT INTO client_manager_assignments (manager_user_id, client_id, assigned_by)
       VALUES (?, ?, ?)`,
    );
    for (const clientId of clientIds) {
      removePreviousManagers.run(clientId);
      insert.run(managerId, clientId, session.user.id);
    }
  })();

  revalidatePath("/admin/team");
  revalidatePath("/admin/clients");
}

export async function assignClientManagerAction(formData: FormData) {
  const session = await requireAdmin();
  const clientId = String(formData.get("client_id") ?? "").trim();
  const managerId = String(formData.get("manager_user_id") ?? "").trim();
  if (!clientId) throw new Error("المتدرب المحدد غير صالح.");

  const db = getDb();
  const client = db.prepare("SELECT id FROM client_profiles WHERE id = ?").get(clientId);
  if (!client) throw new Error("لم يتم العثور على المتدرب.");

  if (managerId) {
    const manager = db
      .prepare("SELECT id FROM users WHERE id = ? AND role = 'admin' AND admin_scope = 'clients'")
      .get(managerId);
    if (!manager) throw new Error("المسؤول المحدد غير صالح.");
  }

  db.transaction(() => {
    db.prepare("DELETE FROM client_manager_assignments WHERE client_id = ?").run(clientId);
    if (managerId) {
      db.prepare(
        `INSERT INTO client_manager_assignments (manager_user_id, client_id, assigned_by)
         VALUES (?, ?, ?)`,
      ).run(managerId, clientId, session.user.id);
    }
  })();

  revalidatePath("/admin/clients");
  revalidatePath("/admin/team");
  revalidatePath(`/admin/clients/${clientId}`);
}
