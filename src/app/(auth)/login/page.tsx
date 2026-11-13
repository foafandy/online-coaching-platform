import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
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

  const params = await searchParams;

  return (
    <div>
      <p className="eyebrow">منطقة العملاء</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">أهلًا بعودتك</h1>
      <p className="mt-2 text-sm text-zinc-400">
        سجّل الدخول للاطلاع على خططك وملفاتك وملاحظات مدربك.
      </p>

      <div className="mt-7">
        <LoginForm
          next={params.next}
          notice={params.reset ? "تم تحديث كلمة المرور. سجّل الدخول بكلمة المرور الجديدة." : undefined}
        />
      </div>

      <p className="mt-6 text-center text-sm text-zinc-400">
        متدرب جديد؟{" "}
        <Link href="/register" className="font-medium text-accent-400 hover:underline">
          أنشئ حسابًا
        </Link>
      </p>
    </div>
  );
}
