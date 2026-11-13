"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  requireAdmin as requireFullAdmin,
  requireClientManager as requireAdmin,
  requireAssignedClient,
  requireAssignedPlan,
} from "@/lib/auth";
import { getDb, STORAGE_DIR } from "@/lib/db";
import { assignCopy } from "@/lib/seed";
import { createNotification } from "@/lib/data";
import type { ClientStatus, FileCategory } from "@/lib/types";

export type ActionState = { error?: string; success?: string };

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const optional = (fd: FormData, key: string) => {
  const value = str(fd, key);
  return value.length ? value : null;
};
const int = (fd: FormData, key: string) => {
  const value = Number.parseInt(str(fd, key), 10);
  return Number.isFinite(value) ? value : null;
};
const isChecked = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";

const CLIENT_STATUSES: ClientStatus[] = ["pending", "active", "inactive", "suspended"];
const STATUS_LABELS: Record<ClientStatus, string> = {
  pending: "قيد المراجعة",
  active: "نشط",
  inactive: "غير نشط",
  suspended: "موقوف",
};
const CATEGORIES: FileCategory[] = [
  "nutrition",
  "workout",
  "progress",
  "exercise",
  "supplements",
  "other",
];

const ALLOWED_FILES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_EXERCISE_VIDEO_BYTES = 100 * 1024 * 1024;
const EXERCISE_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

async function storeExerciseVideo(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  const extension = EXERCISE_VIDEO_TYPES[file.type];
  if (!extension) {
    throw new Error("ارفع فيديو بصيغة MP4 أو WEBM أو MOV.");
  }
  if (file.size > MAX_EXERCISE_VIDEO_BYTES) {
    throw new Error("يجب ألا يتجاوز حجم فيديو التمرين 100 ميجابايت.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const isWebm =
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3;
  const isMp4 = buffer.length >= 8 && buffer.toString("ascii", 4, 8) === "ftyp";
  if ((file.type === "video/webm" && !isWebm) || (file.type !== "video/webm" && !isMp4)) {
    throw new Error("محتوى الملف لا يطابق صيغة الفيديو المحددة.");
  }

  const stored = `exercise-${randomUUID()}.${extension}`;
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(path.join(STORAGE_DIR, stored), buffer, { flag: "wx" });
  return {
    stored,
    originalName: path.basename(file.name).slice(0, 180) || `exercise.${extension}`,
    mimeType: file.type,
    size: file.size,
  };
}

async function removeUnusedExerciseVideo(storedName: string | null) {
  if (!storedName) return;
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM exercises WHERE video_stored_name = ?")
    .get(storedName) as { count: number };
  if (row.count === 0) {
    await fs.rm(path.join(STORAGE_DIR, storedName), { force: true });
  }
}

function exerciseVideoUrl(formData: FormData) {
  const value = optional(formData, "video_url");
  if (!value) return null;
  const parsedUrl = z.string().url().safeParse(value);
  if (!parsedUrl.success || !["http:", "https:"].includes(new URL(value).protocol)) {
    throw new Error("أدخل رابط فيديو صحيحًا يبدأ بـ https:// أو http://.");
  }
  return value;
}

/* --------------------------------- clients -------------------------------- */

export async function setClientStatus(formData: FormData) {
  const clientId = str(formData, "client_id");
  await requireAssignedClient(clientId);
  const status = str(formData, "status") as ClientStatus;
  if (!CLIENT_STATUSES.includes(status)) return;

  const db = getDb();
  const client = db
    .prepare("SELECT user_id, full_name, status FROM client_profiles WHERE id = ?")
    .get(clientId) as { user_id: string; full_name: string; status: ClientStatus } | undefined;
  if (!client) return;

  db.prepare(
    `UPDATE client_profiles
     SET subscription_started_at = CASE
           WHEN ? = 'active' AND status != 'active' THEN datetime('now')
           ELSE subscription_started_at
         END,
         status = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(status, status, clientId);

  if (status !== client.status) {
    const labels: Record<ClientStatus, string> = {
      active: "تم تفعيل حسابك",
      pending: "حسابك قيد المراجعة",
      inactive: "تم إيقاف حسابك",
      suspended: "تم تعليق حسابك",
    };
    const bodies: Record<ClientStatus, string> = {
      active: "أصبح بإمكانك الآن الوصول إلى خططك وملفاتك وملاحظات مدربك.",
      pending: "يراجع مدربك حسابك.",
      inactive: "تواصل مع مدربك لإعادة تفعيل حسابك.",
      suspended: "تواصل مع مدربك لمزيد من المعلومات.",
    };
    createNotification({
      userId: client.user_id,
      title: labels[status],
      body: bodies[status],
      type: "account",
      link: "/dashboard",
    });
  }

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
}

export async function updateClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const clientId = str(formData, "client_id");
  await requireAssignedClient(clientId);

  const schema = z.object({
    full_name: z.string().trim().min(2, "الاسم قصير جدًا").max(80, "يجب ألا يتجاوز الاسم 80 حرفًا."),
    email: z.string().trim().toLowerCase().email("أدخل بريدًا إلكترونيًا صحيحًا"),
    phone: z.string().trim().max(40, "يجب ألا يتجاوز رقم الهاتف 40 حرفًا.").optional(),
    country: z.string().trim().max(100, "اسم الدولة طويل جدًا.").optional(),
    goal: z.string().trim().max(300, "يجب ألا يتجاوز الهدف 300 حرف.").optional(),
    coach_notes: z.string().trim().max(4000, "ملاحظات المدرب طويلة جدًا.").optional(),
    status: z.enum(["pending", "active", "inactive", "suspended"]),
  });

  const parsed = schema.safeParse({
    full_name: str(formData, "full_name"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    country: str(formData, "country"),
    goal: str(formData, "goal"),
    coach_notes: str(formData, "coach_notes"),
    status: str(formData, "status"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "يرجى مراجعة النموذج." };
  }

  const db = getDb();
  const client = db
    .prepare("SELECT user_id, status FROM client_profiles WHERE id = ?")
    .get(clientId) as { user_id: string; status: ClientStatus } | undefined;
  if (!client) return { error: "لم يتم العثور على العميل." };

  const emailTaken = db
    .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
    .get(parsed.data.email, client.user_id);
  if (emailTaken) return { error: "هذا البريد الإلكتروني مستخدم في حساب آخر." };

  db.transaction(() => {
    db.prepare("UPDATE users SET email = ?, updated_at = datetime('now') WHERE id = ?").run(
      parsed.data.email,
      client.user_id,
    );
    db.prepare(
      `UPDATE client_profiles SET full_name = ?, phone = ?, country = ?, goal = ?, coach_notes = ?,
       subscription_started_at = CASE
         WHEN ? = 'active' AND status != 'active' THEN datetime('now')
         ELSE subscription_started_at
       END,
       status = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(
      parsed.data.full_name,
      parsed.data.phone || null,
      parsed.data.country || null,
      parsed.data.goal || null,
      parsed.data.coach_notes || null,
      parsed.data.status,
      parsed.data.status,
      clientId,
    );
  })();

  if (parsed.data.status !== client.status) {
    createNotification({
      userId: client.user_id,
      title:
        parsed.data.status === "active"
          ? "تم تفعيل حسابك"
          : `حالة الحساب: ${STATUS_LABELS[parsed.data.status]}`,
      body:
        parsed.data.status === "active"
          ? "فعّل مدربك حسابك. خططك متاحة الآن في لوحة التحكم."
          : "حدّث مدربك حالة حسابك.",
      type: "account",
      link: "/dashboard",
    });
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
  return { success: "تم حفظ بيانات العميل." };
}

export async function deleteClientAction(formData: FormData) {
  const session = await requireFullAdmin();
  const clientId = str(formData, "client_id");
  const db = getDb();
  const client = db
    .prepare("SELECT user_id FROM client_profiles WHERE id = ?")
    .get(clientId) as { user_id: string } | undefined;
  if (!client || client.user_id === session.user.id) return;

  db.prepare("DELETE FROM users WHERE id = ?").run(client.user_id);
  revalidatePath("/admin/clients");
  redirect("/admin/clients?deleted=1");
}

export async function uploadClientAvatar(formData: FormData) {
  const clientId = str(formData, "client_id");
  await requireAssignedClient(clientId);
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;
  if (file.size > 5 * 1024 * 1024) return;

  const ext = ALLOWED_FILES[file.type];
  const stored = `${randomUUID()}.${ext}`;
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(path.join(STORAGE_DIR, stored), Buffer.from(await file.arrayBuffer()));

  const db = getDb();
  const previous = db
    .prepare("SELECT avatar_path FROM client_profiles WHERE id = ?")
    .get(clientId) as { avatar_path: string | null } | undefined;
  db.prepare(
    "UPDATE client_profiles SET avatar_path = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(stored, clientId);

  if (previous?.avatar_path) {
    await fs.rm(path.join(STORAGE_DIR, previous.avatar_path), { force: true });
  }
  revalidatePath(`/admin/clients/${clientId}`);
}

/* -------------------------------- nutrition ------------------------------- */

export async function createNutritionPlanAction(formData: FormData) {
  const session = await requireFullAdmin();
  const title = str(formData, "title") || "خطة تغذية دون عنوان";
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO nutrition_plans (id, title, description, calories, protein_g, carbs_g, fats_g, notes, is_template, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    )
    .run(
      id,
      title,
      optional(formData, "description"),
      int(formData, "calories"),
      int(formData, "protein_g"),
      int(formData, "carbs_g"),
      int(formData, "fats_g"),
      optional(formData, "notes"),
      session.user.id,
    );
  revalidatePath("/admin/nutrition");
  redirect(`/admin/nutrition/${id}`);
}

export async function updateNutritionPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = str(formData, "plan_id");
  await requireAssignedPlan("nutrition", id);
  const title = str(formData, "title");
  if (!title) return { error: "عنوان الخطة مطلوب." };

  getDb()
    .prepare(
      `UPDATE nutrition_plans SET title = ?, description = ?, calories = ?, protein_g = ?, carbs_g = ?,
       fats_g = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .run(
      title,
      optional(formData, "description"),
      int(formData, "calories"),
      int(formData, "protein_g"),
      int(formData, "carbs_g"),
      int(formData, "fats_g"),
      optional(formData, "notes"),
      id,
    );

  revalidatePath(`/admin/nutrition/${id}`);
  revalidatePath("/admin/nutrition");
  return { success: "تم حفظ الخطة." };
}

export async function deleteNutritionPlanAction(formData: FormData) {
  await requireFullAdmin();
  const id = str(formData, "plan_id");
  getDb().prepare("DELETE FROM nutrition_plans WHERE id = ?").run(id);
  revalidatePath("/admin/nutrition");
  redirect("/admin/nutrition?deleted=1");
}

export async function addMealAction(formData: FormData) {
  const planId = str(formData, "plan_id");
  await requireAssignedPlan("nutrition", planId);
  const title = str(formData, "title");
  if (!planId || !title) return;

  const db = getDb();
  const row = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) as maxOrder FROM nutrition_meals WHERE plan_id = ?")
    .get(planId) as { maxOrder: number };
  const nextNumber = (int(formData, "meal_number") ?? row.maxOrder + 2) || 1;

  db.prepare(
    `INSERT INTO nutrition_meals (id, plan_id, meal_number, title, description, image_path, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    planId,
    nextNumber,
    title,
    optional(formData, "description"),
    optional(formData, "image_path"),
    row.maxOrder + 1,
  );
  db.prepare("UPDATE nutrition_plans SET updated_at = datetime('now') WHERE id = ?").run(planId);
  revalidatePath(`/admin/nutrition/${planId}`);
}

export async function updateMealAction(formData: FormData) {
  const planId = str(formData, "plan_id");
  await requireAssignedPlan("nutrition", planId);
  const mealId = str(formData, "meal_id");
  const title = str(formData, "title");
  if (!mealId || !title) return;
  getDb()
    .prepare(
      `UPDATE nutrition_meals SET title = ?, description = ?, meal_number = ?, image_path = ?
       WHERE id = ? AND plan_id = ?`,
    )
    .run(
      title,
      optional(formData, "description"),
      int(formData, "meal_number") ?? 1,
      optional(formData, "image_path"),
      mealId,
      planId,
    );
  getDb().prepare("UPDATE nutrition_plans SET updated_at = datetime('now') WHERE id = ?").run(planId);
  revalidatePath(`/admin/nutrition/${planId}`);
}

export async function deleteMealAction(formData: FormData) {
  const planId = str(formData, "plan_id");
  await requireAssignedPlan("nutrition", planId);
  getDb().prepare("DELETE FROM nutrition_meals WHERE id = ? AND plan_id = ?").run(
    str(formData, "meal_id"),
    planId,
  );
  revalidatePath(`/admin/nutrition/${planId}`);
}

export async function addMealItemAction(formData: FormData) {
  const planId = str(formData, "plan_id");
  await requireAssignedPlan("nutrition", planId);
  const mealId = str(formData, "meal_id");
  const food = str(formData, "food_name");
  if (!mealId || !food) return;
  const db = getDb();
  const order = db
    .prepare(
      `SELECT COALESCE(MAX(i.sort_order), -1) as maxOrder
       FROM meal_items i JOIN nutrition_meals m ON m.id = i.meal_id
       WHERE i.meal_id = ? AND m.plan_id = ?`,
    )
    .get(mealId, planId) as { maxOrder: number };
  const meal = db
    .prepare("SELECT id FROM nutrition_meals WHERE id = ? AND plan_id = ?")
    .get(mealId, planId);
  if (!meal) return;
  db.prepare(
    "INSERT INTO meal_items (id, meal_id, food_name, quantity, sort_order) VALUES (?, ?, ?, ?, ?)",
  ).run(randomUUID(), mealId, food, optional(formData, "quantity"), order.maxOrder + 1);
  revalidatePath(`/admin/nutrition/${planId}`);
}

export async function deleteMealItemAction(formData: FormData) {
  const planId = str(formData, "plan_id");
  await requireAssignedPlan("nutrition", planId);
  getDb()
    .prepare(
      `DELETE FROM meal_items WHERE id = ?
       AND meal_id IN (SELECT id FROM nutrition_meals WHERE plan_id = ?)`,
    )
    .run(str(formData, "item_id"), planId);
  revalidatePath(`/admin/nutrition/${planId}`);
}

export async function assignNutritionAction(formData: FormData) {
  const session = await requireAdmin();
  const clientId = str(formData, "client_id");
  const planId = str(formData, "plan_id");
  if (!clientId || !planId) return;
  await requireAssignedClient(clientId);
  const template = getDb()
    .prepare("SELECT id FROM nutrition_plans WHERE id = ? AND is_template = 1")
    .get(planId);
  if (!template) throw new Error("قالب خطة التغذية غير صالح.");

  const copyId = assignCopy(getDb(), clientId, "nutrition", planId, session.user.id);
  notifyAssignment(clientId, "nutrition", copyId);
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath(`/admin/nutrition/${planId}`);
  revalidatePath("/admin/nutrition");
  revalidatePath("/dashboard/nutrition");
}

/* --------------------------------- workouts -------------------------------- */

export async function createWorkoutPlanAction(formData: FormData) {
  const session = await requireFullAdmin();
  const title = str(formData, "title") || "برنامج تمارين دون عنوان";
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO workout_plans (id, title, description, split_type, notes, is_template, created_by)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
    )
    .run(
      id,
      title,
      optional(formData, "description"),
      optional(formData, "split_type"),
      optional(formData, "notes"),
      session.user.id,
    );
  revalidatePath("/admin/workouts");
  redirect(`/admin/workouts/${id}`);
}

export async function updateWorkoutPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = str(formData, "plan_id");
  await requireAssignedPlan("workout", id);
  const title = str(formData, "title");
  if (!title) return { error: "عنوان الخطة مطلوب." };
  getDb()
    .prepare(
      `UPDATE workout_plans SET title = ?, description = ?, split_type = ?, notes = ?,
       updated_at = datetime('now') WHERE id = ?`,
    )
    .run(
      title,
      optional(formData, "description"),
      optional(formData, "split_type"),
      optional(formData, "notes"),
      id,
    );
  revalidatePath(`/admin/workouts/${id}`);
  revalidatePath("/admin/workouts");
  return { success: "تم حفظ الخطة." };
}

export async function deleteWorkoutPlanAction(formData: FormData) {
  await requireFullAdmin();
  getDb().prepare("DELETE FROM workout_plans WHERE id = ?").run(str(formData, "plan_id"));
  revalidatePath("/admin/workouts");
  redirect("/admin/workouts?deleted=1");
}

export async function addWorkoutDayAction(formData: FormData) {
  const planId = str(formData, "plan_id");
  await requireAssignedPlan("workout", planId);
  const title = str(formData, "title");
  if (!planId || !title) return;
  const db = getDb();
  const order = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM workout_days WHERE plan_id = ?")
    .get(planId) as { maxOrder: number };
  db.prepare(
    `INSERT INTO workout_days (id, plan_id, day_number, title, focus, notes, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    planId,
    int(formData, "day_number") ?? order.maxOrder + 1,
    title,
    optional(formData, "focus"),
    optional(formData, "notes"),
    order.maxOrder + 1,
  );
  db.prepare("UPDATE workout_plans SET updated_at = datetime('now') WHERE id = ?").run(planId);
  revalidatePath(`/admin/workouts/${planId}`);
}

export async function updateWorkoutDayAction(formData: FormData) {
  const planId = str(formData, "plan_id");
  await requireAssignedPlan("workout", planId);
  const dayId = str(formData, "day_id");
  const title = str(formData, "title");
  if (!dayId || !title) return;
  getDb()
    .prepare(
      "UPDATE workout_days SET title = ?, focus = ?, notes = ?, day_number = ? WHERE id = ? AND plan_id = ?",
    )
    .run(
      title,
      optional(formData, "focus"),
      optional(formData, "notes"),
      int(formData, "day_number") ?? 1,
      dayId,
      planId,
    );
  revalidatePath(`/admin/workouts/${planId}`);
}

export async function deleteWorkoutDayAction(formData: FormData) {
  const planId = str(formData, "plan_id");
  await requireAssignedPlan("workout", planId);
  getDb().prepare("DELETE FROM workout_days WHERE id = ? AND plan_id = ?").run(
    str(formData, "day_id"),
    planId,
  );
  revalidatePath(`/admin/workouts/${planId}`);
}

export async function addExerciseAction(formData: FormData) {
  const planId = str(formData, "plan_id");
  await requireAssignedPlan("workout", planId);
  const dayId = str(formData, "day_id");
  const name = str(formData, "name");
  if (!dayId || !name) return;
  const db = getDb();
  const order = db
    .prepare(
      `SELECT COALESCE(MAX(e.sort_order), -1) as maxOrder
       FROM exercises e JOIN workout_days d ON d.id = e.day_id
       WHERE e.day_id = ? AND d.plan_id = ?`,
    )
    .get(dayId, planId) as { maxOrder: number };
  const day = db.prepare("SELECT id FROM workout_days WHERE id = ? AND plan_id = ?").get(dayId, planId);
  if (!day) return;
  const videoUrl = exerciseVideoUrl(formData);
  const video = await storeExerciseVideo(formData.get("video_file"));
  try {
    db.prepare(
      `INSERT INTO exercises (
         id, day_id, name, sets, reps, rest_seconds, video_url, video_stored_name,
         video_original_name, video_mime_type, video_size_bytes, instructions, coach_notes, sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      dayId,
      name,
      optional(formData, "sets"),
      optional(formData, "reps"),
      int(formData, "rest_seconds"),
      video?.stored ? null : videoUrl,
      video?.stored ?? null,
      video?.originalName ?? null,
      video?.mimeType ?? null,
      video?.size ?? null,
      optional(formData, "instructions"),
      optional(formData, "coach_notes"),
      order.maxOrder + 1,
    );
  } catch (error) {
    if (video) await fs.rm(path.join(STORAGE_DIR, video.stored), { force: true });
    throw error;
  }
  revalidatePath(`/admin/workouts/${planId}`);
}

export async function updateExerciseAction(formData: FormData) {
  const planId = str(formData, "plan_id");
  await requireAssignedPlan("workout", planId);
  const exerciseId = str(formData, "exercise_id");
  const name = str(formData, "name");
  if (!exerciseId || !name) return;
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT video_stored_name FROM exercises WHERE id = ?
       AND day_id IN (SELECT id FROM workout_days WHERE plan_id = ?)`,
    )
    .get(exerciseId, planId) as { video_stored_name: string | null } | undefined;
  if (!existing) return;
  const videoUrl = exerciseVideoUrl(formData);
  const video = await storeExerciseVideo(formData.get("video_file"));
  db.prepare(
    `UPDATE exercises SET name = ?, sets = ?, reps = ?, rest_seconds = ?,
       video_url = CASE WHEN ? THEN NULL ELSE ? END,
       video_stored_name = CASE WHEN ? THEN ? WHEN ? THEN NULL ELSE video_stored_name END,
       video_original_name = CASE WHEN ? THEN ? WHEN ? THEN NULL ELSE video_original_name END,
       video_mime_type = CASE WHEN ? THEN ? WHEN ? THEN NULL ELSE video_mime_type END,
       video_size_bytes = CASE WHEN ? THEN ? WHEN ? THEN NULL ELSE video_size_bytes END,
       instructions = ?, coach_notes = ? WHERE id = ?
       AND day_id IN (SELECT id FROM workout_days WHERE plan_id = ?)`,
  ).run(
    name,
    optional(formData, "sets"),
    optional(formData, "reps"),
    int(formData, "rest_seconds"),
    Boolean(video),
    videoUrl,
    Boolean(video),
    video?.stored ?? null,
    Boolean(videoUrl),
    Boolean(video),
    video?.originalName ?? null,
    Boolean(videoUrl),
    Boolean(video),
    video?.mimeType ?? null,
    Boolean(videoUrl),
    Boolean(video),
    video?.size ?? null,
    Boolean(videoUrl),
    optional(formData, "instructions"),
    optional(formData, "coach_notes"),
    exerciseId,
    planId,
  );
  if ((video || videoUrl) && existing.video_stored_name) {
    await removeUnusedExerciseVideo(existing.video_stored_name);
  }
  revalidatePath(`/admin/workouts/${planId}`);
}

export async function deleteExerciseAction(formData: FormData) {
  const planId = str(formData, "plan_id");
  await requireAssignedPlan("workout", planId);
  const db = getDb();
  const exerciseId = str(formData, "exercise_id");
  const existing = db
    .prepare(
      `SELECT e.video_stored_name FROM exercises e
       JOIN workout_days d ON d.id = e.day_id
       WHERE e.id = ? AND d.plan_id = ?`,
    )
    .get(exerciseId, planId) as { video_stored_name: string | null } | undefined;
  db
    .prepare(
      `DELETE FROM exercises WHERE id = ?
       AND day_id IN (SELECT id FROM workout_days WHERE plan_id = ?)`,
    )
    .run(exerciseId, planId);
  await removeUnusedExerciseVideo(existing?.video_stored_name ?? null);
  revalidatePath(`/admin/workouts/${planId}`);
}

export async function assignWorkoutAction(formData: FormData) {
  const session = await requireAdmin();
  const clientId = str(formData, "client_id");
  const planId = str(formData, "plan_id");
  if (!clientId || !planId) return;
  await requireAssignedClient(clientId);
  const template = getDb()
    .prepare("SELECT id FROM workout_plans WHERE id = ? AND is_template = 1")
    .get(planId);
  if (!template) throw new Error("قالب برنامج التمارين غير صالح.");
  const copyId = assignCopy(getDb(), clientId, "workout", planId, session.user.id);
  notifyAssignment(clientId, "workout", copyId);
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath(`/admin/workouts/${planId}`);
  revalidatePath("/admin/workouts");
  revalidatePath("/dashboard/workouts");
}

function notifyAssignment(clientId: string, kind: "nutrition" | "workout", planId: string) {
  const row = getDb()
    .prepare(
      `SELECT u.id as user_id,
        CASE WHEN ? = 'nutrition' THEN (SELECT title FROM nutrition_plans WHERE id = ?)
             ELSE (SELECT title FROM workout_plans WHERE id = ?) END as title
       FROM client_profiles p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
    )
    .get(kind, planId, planId, clientId) as { user_id: string; title: string | null } | undefined;
  if (!row) return;
  createNotification({
    userId: row.user_id,
    title: kind === "nutrition" ? "تم تعيين خطة تغذية جديدة" : "تم تعيين برنامج تمارين جديد",
    body: `أصبحت خطة «${row.title ?? "خطتك الجديدة"}» متاحة الآن في لوحة التحكم.`,
    type: kind,
    link: kind === "nutrition" ? "/dashboard/nutrition" : "/dashboard/workouts",
  });
}

/* ---------------------------------- files --------------------------------- */

async function storeUpload(file: File): Promise<{ stored: string; ext: string } | null> {
  const ext = ALLOWED_FILES[file.type];
  if (!ext) return null;
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) return null;
  const stored = `${randomUUID()}.${ext}`;
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(path.join(STORAGE_DIR, stored), Buffer.from(await file.arrayBuffer()));
  return { stored, ext };
}

async function writeAssignments(fileId: string, clientIds: string[]) {
  const db = getDb();
  db.prepare("DELETE FROM file_assignments WHERE file_id = ?").run(fileId);
  const insert = db.prepare(
    "INSERT OR IGNORE INTO file_assignments (id, file_id, client_id) VALUES (?, ?, ?)",
  );
  for (const clientId of clientIds) insert.run(randomUUID(), fileId, clientId);
}

function selectedClients(formData: FormData): string[] {
  return formData
    .getAll("client_ids")
    .map(String)
    .filter((id) => id.length > 0);
}

export async function uploadFilesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireFullAdmin();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "اختر ملفًا واحدًا على الأقل لرفعه." };

  const category = str(formData, "category") as FileCategory;
  if (!CATEGORIES.includes(category)) return { error: "اختر تصنيفًا صحيحًا." };

  const title = str(formData, "title");
  const description = optional(formData, "description");
  const clientIds = selectedClients(formData);

  const db = getDb();
  let uploaded = 0;
  const failed: string[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      failed.push(`${file.name} (أكبر من 50 ميجابايت)`);
      continue;
    }
    const stored = await storeUpload(file);
    if (!stored) {
      failed.push(`${file.name} (نوع الملف غير مدعوم)`);
      continue;
    }
    const fileId = randomUUID();
    db.prepare(
      `INSERT INTO files (id, title, description, category, original_name, stored_name, mime_type, size_bytes, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      fileId,
      files.length === 1 && title ? title : file.name.replace(/\.[^.]+$/, ""),
      description,
      category,
      file.name,
      stored.stored,
      file.type,
      file.size,
      session.user.id,
    );
    await writeAssignments(fileId, clientIds);
    notifyFileRecipients(fileId, files.length === 1 && title ? title : file.name, category);
    uploaded += 1;
  }

  revalidatePath("/admin/files");
  revalidatePath("/dashboard/files");

  if (uploaded === 0) {
    return { error: `لم يتم رفع أي ملف. ${failed.join("، ")}` };
  }
  return {
    success:
      `تم رفع ${uploaded} ملف` +
      (clientIds.length ? ` وتعيينه إلى ${clientIds.length} عميل.` : ".") +
      (failed.length ? ` تم تخطي: ${failed.join("، ")}.` : ""),
  };
}

function notifyFileRecipients(fileId: string, title: string, category: FileCategory) {
  const recipients = getDb()
    .prepare(
      `SELECT u.id as user_id FROM file_assignments fa
       JOIN client_profiles cp ON cp.id = fa.client_id
       JOIN users u ON u.id = cp.user_id
       WHERE fa.file_id = ?`,
    )
    .all(fileId) as Array<{ user_id: string }>;
  for (const recipient of recipients) {
    createNotification({
      userId: recipient.user_id,
      title: "ملف جديد من مدربك",
      body: `تمت إضافة «${title}» إلى ملفاتك.`,
      type: "file",
      link: "/dashboard/files",
    });
  }
}

export async function updateFileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireFullAdmin();
  const fileId = str(formData, "file_id");
  const title = str(formData, "title");
  const category = str(formData, "category") as FileCategory;
  if (!title) return { error: "اسم الملف مطلوب." };
  if (!CATEGORIES.includes(category)) return { error: "اختر تصنيفًا صحيحًا." };

  const db = getDb();
  db.prepare(
    "UPDATE files SET title = ?, description = ?, category = ? WHERE id = ?",
  ).run(title, optional(formData, "description"), category, fileId);

  const before = db
    .prepare("SELECT client_id FROM file_assignments WHERE file_id = ?")
    .all(fileId) as Array<{ client_id: string }>;
  const previous = new Set(before.map((row) => row.client_id));
  const next = selectedClients(formData);
  await writeAssignments(fileId, next);

  for (const clientId of next) {
    if (!previous.has(clientId)) {
      const user = db
        .prepare("SELECT user_id FROM client_profiles WHERE id = ?")
        .get(clientId) as { user_id: string } | undefined;
      if (user) {
        createNotification({
          userId: user.user_id,
          title: "ملف جديد من مدربك",
          body: `أصبح الملف «${title}» متاحًا الآن ضمن ملفاتك.`,
          type: "file",
          link: "/dashboard/files",
        });
      }
    }
  }

  revalidatePath("/admin/files");
  revalidatePath(`/admin/files/${fileId}`);
  return { success: "تم تحديث الملف." };
}

export async function replaceFileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireFullAdmin();
  const fileId = str(formData, "file_id");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "اختر ملفًا بديلًا." };
  if (file.size > MAX_FILE_BYTES) return { error: "يجب ألا يتجاوز حجم الملف 50 ميجابايت." };

  const stored = await storeUpload(file);
  if (!stored) return { error: "نوع الملف غير مدعوم." };

  const db = getDb();
  const existing = db
    .prepare("SELECT stored_name FROM files WHERE id = ?")
    .get(fileId) as { stored_name: string } | undefined;
  if (!existing) return { error: "لم يتم العثور على الملف." };

  db.prepare(
    `UPDATE files SET stored_name = ?, original_name = ?, mime_type = ?, size_bytes = ?,
     created_at = datetime('now') WHERE id = ?`,
  ).run(stored.stored, file.name, file.type, file.size, fileId);

  await fs.rm(path.join(STORAGE_DIR, existing.stored_name), { force: true });

  const recipients = db
    .prepare(
      `SELECT u.id as user_id, f.title FROM file_assignments fa
       JOIN client_profiles cp ON cp.id = fa.client_id
       JOIN users u ON u.id = cp.user_id JOIN files f ON f.id = fa.file_id
       WHERE fa.file_id = ?`,
    )
    .all(fileId) as Array<{ user_id: string; title: string }>;
  for (const recipient of recipients) {
    createNotification({
      userId: recipient.user_id,
      title: "تم تحديث الملف",
      body: `تم استبدال «${recipient.title}» بنسخة جديدة.`,
      type: "file",
      link: "/dashboard/files",
    });
  }

  revalidatePath("/admin/files");
  revalidatePath(`/admin/files/${fileId}`);
  return { success: "تم استبدال الملف بالنسخة الجديدة." };
}

export async function deleteFileAction(formData: FormData) {
  await requireFullAdmin();
  const fileId = str(formData, "file_id");
  const db = getDb();
  const row = db.prepare("SELECT stored_name FROM files WHERE id = ?").get(fileId) as
    | { stored_name: string }
    | undefined;
  db.prepare("DELETE FROM files WHERE id = ?").run(fileId);
  if (row) await fs.rm(path.join(STORAGE_DIR, row.stored_name), { force: true });
  revalidatePath("/admin/files");
}

export async function setFileClientsAction(formData: FormData) {
  await requireFullAdmin();
  const fileId = str(formData, "file_id");
  await writeAssignments(fileId, selectedClients(formData));
  revalidatePath("/admin/files");
  revalidatePath(`/admin/files/${fileId}`);
  revalidatePath("/dashboard/files");
}

export async function setClientFilesAction(formData: FormData) {
  const clientId = str(formData, "client_id");
  const session = await requireAssignedClient(clientId);
  if (!clientId) return;
  const fileIds = [...new Set(formData
    .getAll("file_ids")
    .map(String)
    .filter(Boolean))];

  const db = getDb();
  if (session.user.admin_scope === "clients" && fileIds.length) {
    const placeholders = fileIds.map(() => "?").join(", ");
    const allowed = db
      .prepare(
        `SELECT f.id FROM files f
         WHERE f.id IN (${placeholders})
           AND (
             NOT EXISTS (SELECT 1 FROM file_assignments fa WHERE fa.file_id = f.id)
             OR EXISTS (
               SELECT 1 FROM file_assignments fa
               WHERE fa.file_id = f.id AND fa.client_id = ?
             )
           )`,
      )
      .all(...fileIds, clientId) as Array<{ id: string }>;
    if (allowed.length !== fileIds.length) {
      throw new Error("لا يمكن تعيين ملف غير متاح لهذا المتدرب.");
    }
  }
  const before = new Set(
    (
      db.prepare("SELECT file_id FROM file_assignments WHERE client_id = ?").all(clientId) as Array<{
        file_id: string;
      }>
    ).map((row) => row.file_id),
  );

  const user = db
    .prepare("SELECT user_id FROM client_profiles WHERE id = ?")
    .get(clientId) as { user_id: string } | undefined;

  db.transaction(() => {
    db.prepare("DELETE FROM file_assignments WHERE client_id = ?").run(clientId);
    const insert = db.prepare(
      "INSERT OR IGNORE INTO file_assignments (id, file_id, client_id) VALUES (?, ?, ?)",
    );
    for (const fileId of fileIds) insert.run(randomUUID(), fileId, clientId);
  })();

  if (user) {
    for (const fileId of fileIds) {
      if (before.has(fileId)) continue;
      const file = db.prepare("SELECT title FROM files WHERE id = ?").get(fileId) as
        | { title: string }
        | undefined;
      if (!file) continue;
      createNotification({
        userId: user.user_id,
        title: "ملف جديد من مدربك",
        body: `أصبح الملف «${file.title}» متاحًا الآن ضمن ملفاتك.`,
        type: "file",
        link: "/dashboard/files",
      });
    }
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/dashboard/files");
}

/* ------------------------------ announcements ----------------------------- */

export async function createAnnouncementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireFullAdmin();
  const title = str(formData, "title");
  const body = str(formData, "body");
  if (!title || !body) return { error: "العنوان والرسالة مطلوبان." };

  const db = getDb();
  db.prepare(
    "INSERT INTO announcements (id, title, body, is_active, created_by) VALUES (?, ?, ?, ?, ?)",
  ).run(randomUUID(), title, body, isChecked(formData, "publish") ? 1 : 0, session.user.id);

  if (isChecked(formData, "publish")) {
    const clients = db
      .prepare(
        `SELECT u.id as user_id FROM users u JOIN client_profiles p ON p.user_id = u.id
         WHERE p.status = 'active'`,
      )
      .all() as Array<{ user_id: string }>;
    for (const client of clients) {
      createNotification({
        userId: client.user_id,
        title: "إعلان جديد من FA COACHING",
        body: title,
        type: "announcement",
        link: "/dashboard#announcements",
      });
    }
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return {
    success: isChecked(formData, "publish") ? "تم نشر الإعلان." : "تم حفظ المسودة.",
  };
}

export async function toggleAnnouncementAction(formData: FormData) {
  await requireFullAdmin();
  const id = str(formData, "announcement_id");
  getDb().prepare("UPDATE announcements SET is_active = 1 - is_active WHERE id = ?").run(id);
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

export async function deleteAnnouncementAction(formData: FormData) {
  await requireFullAdmin();
  getDb().prepare("DELETE FROM announcements WHERE id = ?").run(str(formData, "announcement_id"));
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}
