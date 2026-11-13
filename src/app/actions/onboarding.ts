"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireClient } from "@/lib/auth";
import { getDb, STORAGE_DIR } from "@/lib/db";
import { getClientOnboarding } from "@/lib/data";

export type OnboardingState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const onboardingSchema = z.object({
  weight_kg: z.coerce.number().min(25, "أدخل وزنًا صحيحًا").max(350, "أدخل وزنًا صحيحًا"),
  height_cm: z.coerce.number().min(100, "أدخل طولًا صحيحًا").max(250, "أدخل طولًا صحيحًا"),
  age: z.coerce.number().int().min(13, "العمر يجب أن يكون 13 سنة على الأقل").max(100, "أدخل عمرًا صحيحًا"),
  experience: z.enum(["beginner", "some", "experienced"], { error: "اختر مستوى خبرتك" }),
  goal: z.string().trim().min(2, "اكتب هدفك من التمرين").max(500, "الهدف طويل جدًا"),
  training_days: z.coerce.number().int().min(1).max(7),
  training_location: z.enum(["gym", "home", "other"], { error: "اختر مكان التمرين" }),
  health_flag: z.enum(["yes", "no"], { error: "أجب عن سؤال الحالة الصحية" }),
  health_notes: z.string().trim().max(1200, "الإجابة طويلة جدًا"),
  dietary_notes: z.string().trim().max(1200, "الإجابة طويلة جدًا"),
});

const photoFields = ["photo_front", "photo_side", "photo_back"] as const;
type PhotoField = (typeof photoFields)[number];
const photoLabels: Record<PhotoField, string> = {
  photo_front: "الصورة الأمامية",
  photo_side: "الصورة الجانبية",
  photo_back: "الصورة الخلفية",
};
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function imageExtension(file: File): "jpg" | "png" | "webp" | null {
  if (file.size === 0 || file.size > MAX_PHOTO_BYTES) return null;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return null;
}

function matchesImageType(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return (
    mimeType === "image/webp" &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}

export async function submitOnboardingAction(
  _previous: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const { profile } = await requireClient();
  const parsed = onboardingSchema.safeParse({
    weight_kg: formData.get("weight_kg"),
    height_cm: formData.get("height_cm"),
    age: formData.get("age"),
    experience: formData.get("experience"),
    goal: formData.get("goal"),
    training_days: formData.get("training_days"),
    training_location: formData.get("training_location"),
    health_flag: formData.get("health_flag"),
    health_notes: formData.get("health_notes"),
    dietary_notes: formData.get("dietary_notes"),
  });

  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }

  if (formData.get("photo_consent") !== "on") {
    fieldErrors.photo_consent = "لازم توافق على حفظ الصور وإتاحتها للمدرب قبل الإرسال.";
  }

  const photos = new Map<PhotoField, { extension: string; buffer: Buffer }>();
  for (const field of photoFields) {
    const entry = formData.get(field);
    const extension = entry instanceof File ? imageExtension(entry) : null;
    if (!(entry instanceof File) || !extension) {
      fieldErrors[field] = `${photoLabels[field]} مطلوبة. استخدم JPG أو PNG أو WebP بحد أقصى 5 ميجابايت.`;
      continue;
    }
    const buffer = Buffer.from(await entry.arrayBuffer());
    if (!matchesImageType(buffer, entry.type)) {
      fieldErrors[field] = `${photoLabels[field]} ليست صورة صالحة من النوع المحدد.`;
      continue;
    }
    photos.set(field, { extension, buffer });
  }

  if (!parsed.success || Object.keys(fieldErrors).length > 0) {
    return { error: "يرجى مراجعة البيانات المطلوبة.", fieldErrors };
  }

  const previous = getClientOnboarding(profile.id);
  const savedPaths: string[] = [];
  const photoPaths = {} as Record<PhotoField, string>;
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    for (const field of photoFields) {
      const photo = photos.get(field);
      if (!photo) throw new Error(`Validated onboarding photo is missing: ${field}`);
      const storedName = `onboarding-${randomUUID()}.${photo.extension}`;
      await fs.writeFile(path.join(STORAGE_DIR, storedName), photo.buffer, { flag: "wx" });
      savedPaths.push(storedName);
      photoPaths[field] = storedName;
    }

    const db = getDb();
    db.transaction(() => {
      db.prepare(
        `INSERT INTO client_onboarding (
           client_id, weight_kg, height_cm, age, experience, goal, training_days,
           training_location, health_flag, health_notes, dietary_notes,
           photo_front, photo_side, photo_back, photo_consent_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(client_id) DO UPDATE SET
           weight_kg = excluded.weight_kg,
           height_cm = excluded.height_cm,
           age = excluded.age,
           experience = excluded.experience,
           goal = excluded.goal,
           training_days = excluded.training_days,
           training_location = excluded.training_location,
           health_flag = excluded.health_flag,
           health_notes = excluded.health_notes,
           dietary_notes = excluded.dietary_notes,
           photo_front = excluded.photo_front,
           photo_side = excluded.photo_side,
           photo_back = excluded.photo_back,
           photo_consent_at = datetime('now'),
           submitted_at = datetime('now'),
           updated_at = datetime('now')`,
      ).run(
        profile.id,
        parsed.data.weight_kg,
        parsed.data.height_cm,
        parsed.data.age,
        parsed.data.experience,
        parsed.data.goal,
        parsed.data.training_days,
        parsed.data.training_location,
        parsed.data.health_flag,
        parsed.data.health_notes,
        parsed.data.dietary_notes,
        photoPaths.photo_front,
        photoPaths.photo_side,
        photoPaths.photo_back,
      );

      const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as Array<{
        id: string;
      }>;
      const notify = db.prepare(
        "INSERT INTO notifications (id, user_id, title, body, type, link) VALUES (?, ?, ?, ?, 'account', ?)",
      );
      for (const admin of admins) {
        notify.run(
          randomUUID(),
          admin.id,
          "اكتملت بيانات متدرب جديد",
          `أرسل ${profile.full_name} بياناته وصور التقدم لمراجعتها.`,
          `/admin/clients/${profile.id}`,
        );
      }
    })();
  } catch (error) {
    for (const storedName of savedPaths) {
      try {
        await fs.unlink(path.join(STORAGE_DIR, storedName));
      } catch (cleanupError) {
        if ((cleanupError as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error("Could not clean up an incomplete onboarding photo upload.", cleanupError);
        }
      }
    }
    throw error;
  }

  if (previous) {
    for (const oldName of [previous.photo_front, previous.photo_side, previous.photo_back]) {
      try {
        await fs.unlink(path.join(STORAGE_DIR, path.basename(oldName)));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error("Could not remove a replaced onboarding photo.", error);
        }
      }
    }
  }

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${profile.id}`);
  redirect("/dashboard");
}
