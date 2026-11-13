import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { RegisterForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default async function RegisterPage() {
  const session = await getSessionUser();
  if (session) {
    redirect(
      session.user.role === "admin"
        ? session.user.admin_scope === "clients"
          ? "/admin/clients"
          : "/admin"
        : "/dashboard",
    );
  }

  return (
    <div>
      <p className="eyebrow">انضم إلى عملائنا</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">أنشئ حسابك</h1>
      <p className="mt-2 text-sm text-zinc-400">
        لن يستغرق الأمر دقيقة. سيُفعّل مدربك حسابك قبل إعداد أول خطة لك.
      </p>

      <div className="mt-7">
        <RegisterForm />
      </div>

      <p className="mt-6 text-center text-sm text-zinc-400">
        لديك حساب بالفعل؟{" "}
        <Link href="/login" className="font-medium text-accent-400 hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
