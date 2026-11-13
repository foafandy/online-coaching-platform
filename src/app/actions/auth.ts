"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  clearAttempts,
  consumePasswordReset,
  createPasswordReset,
  createSession,
  destroySession,
  hashPassword,
  recordAttempt,
  tooManyAttempts,
  verifyPassword,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { appUrl, sendMail } from "@/lib/mail";

export type AuthState = {
  error?: string;
  success?: string;
  devLink?: string;
  fieldErrors?: Record<string, string>;
};

function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, "أدخل اسمك الكامل").max(80, "يجب ألا يتجاوز الاسم 80 حرفًا."),
    email: z.string().trim().toLowerCase().email("أدخل بريدًا إلكترونيًا صحيحًا"),
    phone: z.string().trim().min(7, "أدخل رقم هاتف صحيحًا").max(40, "رقم الهاتف طويل جدًا."),
    country: z.string().trim().min(2, "أدخل اسم الدولة").max(100, "اسم الدولة طويل جدًا."),
    password: z
      .string()
      .min(8, "يجب ألا تقل كلمة المرور عن 8 أحرف")
      .max(200, "كلمة المرور طويلة جدًا."),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
    message: "كلمتا المرور غير متطابقتين",
  });

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    country: formData.get("country"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "يرجى مراجعة الحقول الموضحة.", fieldErrors };
  }

  const { full_name, email, phone, country, password } = parsed.data;
  const db = getDb();

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return { error: "يوجد حساب مسجل بهذا البريد الإلكتروني. جرّب تسجيل الدخول." };
  }

  const userId = randomUUID();
  const profileId = randomUUID();

  db.transaction(() => {
    db.prepare(
      "INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'client')",
    ).run(userId, email, hashPassword(password));
    db.prepare(
      "INSERT INTO client_profiles (id, user_id, full_name, phone, country, status) VALUES (?, ?, ?, ?, ?, 'pending')",
    ).run(profileId, userId, full_name, phone, country);

    // Notify the coach about the new registration.
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
        "تسجيل عميل جديد",
        `أنشأ ${full_name} (${email}) حسابًا جديدًا وينتظر التفعيل.`,
        `/admin/clients/${profileId}`,
      );
    }
    notify.run(
      randomUUID(),
      userId,
      "مرحبًا بك في FA COACHING",
      "تم إنشاء حسابك. سيُفعّله مدربك قريبًا، وسنرسل إليك إشعارًا بذلك.",
      "/dashboard",
    );
  })();

  await createSession(userId);
  redirect("/onboarding");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("أدخل بريدًا إلكترونيًا صحيحًا"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات تسجيل الدخول غير صحيحة." };
  }

  const { email, password } = parsed.data;
  const limitKey = `login:${email}`;
  if (tooManyAttempts(limitKey)) {
    return { error: "محاولات كثيرة. يُرجى الانتظار 15 دقيقة ثم المحاولة مجددًا." };
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id, email, role, password_hash FROM users WHERE email = ?")
    .get(email) as
    | { id: string; email: string; role: "admin" | "client"; password_hash: string }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    recordAttempt(limitKey);
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  }

  clearAttempts(limitKey);
  await createSession(user.id);

  const next = safeNext(formData.get("next"));
  if (next) redirect(next);
  if (user.role === "admin") {
    const admin = getDb()
      .prepare("SELECT admin_scope FROM users WHERE id = ?")
      .get(user.id) as { admin_scope: "full" | "clients" | null } | undefined;
    redirect(admin?.admin_scope === "clients" ? "/admin/clients" : "/admin");
  }
  const profile = getDb()
    .prepare("SELECT id FROM client_profiles WHERE user_id = ?")
    .get(user.id) as { id: string } | undefined;
  const onboarding = profile
    ? getDb()
        .prepare("SELECT 1 FROM client_onboarding WHERE client_id = ?")
        .get(profile.id)
    : undefined;
  redirect(onboarding ? "/dashboard" : "/onboarding");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!z.string().email().safeParse(email).success) {
    return { error: "أدخل بريدًا إلكترونيًا صحيحًا." };
  }

  const db = getDb();
  const user = db.prepare("SELECT id, email FROM users WHERE email = ?").get(email) as
    | { id: string; email: string }
    | undefined;

  const genericSuccess =
    "إذا كان هناك حساب مرتبط بهذا البريد، فقد أرسلنا رابط إعادة التعيين. تحقق من بريدك الوارد.";

  if (!user) {
    // Same response and comparable timing to avoid account enumeration.
    return { success: genericSuccess };
  }

  const token = createPasswordReset(user.id);
  const link = `${appUrl()}/reset-password?token=${token}`;

  await sendMail({
    to: user.email,
    subject: "إعادة تعيين كلمة مرور FA COACHING",
    text: `استخدم هذا الرابط لاختيار كلمة مرور جديدة (صالح لمدة 60 دقيقة):\n\n${link}\n\nإذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.`,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;background:#0b0c0b;color:#f4f4f5;padding:32px">
      <h2 style="color:#c2b098;margin:0 0 12px">FA COACHING</h2>
      <p style="margin:0 0 20px">أعد تعيين كلمة المرور باستخدام الزر أدناه. تنتهي صلاحية الرابط خلال 60 دقيقة.</p>
      <a href="${link}" style="display:inline-block;background:#c2b098;color:#070807;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">اختيار كلمة مرور جديدة</a>
      <p style="color:#8b8f8b;font-size:12px;margin-top:24px">إذا لم تطلب ذلك، فتجاهل هذه الرسالة.</p>
    </div>`,
  });

  return {
    success: genericSuccess,
    devLink: process.env.RESEND_API_KEY ? undefined : link,
  };
}

const resetSchema = z
  .object({
    token: z.string().min(10, "رابط إعادة التعيين غير صالح."),
    password: z
      .string()
      .min(8, "يجب ألا تقل كلمة المرور عن 8 أحرف")
      .max(200, "كلمة المرور طويلة جدًا."),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
    message: "كلمتا المرور غير متطابقتين",
  });

export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "الطلب غير صالح." };
  }

  const ok = consumePasswordReset(parsed.data.token, parsed.data.password);
  if (!ok) {
    return { error: "رابط إعادة التعيين غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا." };
  }

  revalidatePath("/login");
  redirect("/login?reset=1");
}
