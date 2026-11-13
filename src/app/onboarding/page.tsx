import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { OnboardingForm } from "@/components/onboarding-form";
import { Brand } from "@/components/brand";
import { getSessionUser, requireClient } from "@/lib/auth";
import { getClientOnboarding } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=%2Fonboarding");
  if (session.user.role === "admin") {
    redirect(session.user.admin_scope === "clients" ? "/admin/clients" : "/admin");
  }
  const { profile } = await requireClient();
  if (getClientOnboarding(profile.id)) redirect("/dashboard");

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <Brand compact />
          <form action={logoutAction}>
            <button type="submit" className="btn-ghost btn-sm">تسجيل الخروج</button>
          </form>
        </header>
        <div className="card p-5 sm:p-8">
          <p className="eyebrow">خطوتك الأولى</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">عرّفنا بنفسك</h1>
          <p className="mb-7 mt-2 text-sm leading-relaxed text-zinc-400">
            أكمل البيانات التالية حتى يتمكن المدرب من فهم احتياجاتك وتجهيز خطة مناسبة لك.
          </p>
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
