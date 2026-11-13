import Link from "next/link";
import type { Metadata } from "next";
import { ResetForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "تعيين كلمة مرور جديدة" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div>
      <p className="eyebrow">استعادة الحساب</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">تعيين كلمة مرور جديدة</h1>
      <p className="mt-2 text-sm text-zinc-400">اختر كلمة مرور قوية وغير مستخدمة في مواقع أخرى.</p>

      <div className="mt-7">
        {token ? (
          <ResetForm token={token} />
        ) : (
          <>
            <Alert tone="error">
              رابط إعادة التعيين غير مكتمل. اطلب رابطًا جديدًا للمتابعة.
            </Alert>
            <Link href="/forgot-password" className="btn-ghost mt-4 w-full">
              طلب رابط جديد
            </Link>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-zinc-400">
        <Link href="/login" className="font-medium text-accent-400 hover:underline">
          العودة لتسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
