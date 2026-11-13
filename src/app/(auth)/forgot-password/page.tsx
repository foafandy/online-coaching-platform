import Link from "next/link";
import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "استعادة كلمة المرور" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <p className="eyebrow">استعادة الحساب</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">نسيت كلمة المرور؟</h1>
      <p className="mt-2 text-sm text-zinc-400">
        أدخل البريد الإلكتروني المسجل في حسابك وسنرسل إليك رابطًا آمنًا لتعيين كلمة مرور جديدة.
      </p>

      <div className="mt-7">
        <ForgotForm />
      </div>

      <p className="mt-6 text-center text-sm text-zinc-400">
        <Link href="/login" className="font-medium text-accent-400 hover:underline">
          العودة لتسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
