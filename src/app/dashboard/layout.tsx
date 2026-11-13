import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, LogOut, ShieldAlert } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { getClientOnboarding, listNotifications, unreadNotificationCount } from "@/lib/data";
import { ClientShell } from "@/components/client-shell";
import { Brand } from "@/components/brand";
import { logoutAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "لوحة التحكم" };
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireClient();
  if (!getClientOnboarding(profile.id)) redirect("/onboarding");
  const unread = unreadNotificationCount(user.id);

  if (profile.status !== "active") {
    const pending = profile.status === "pending";
    return (
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-5">
          <Brand href="/dashboard" />
          <form action={logoutAction}>
            <button className="btn-ghost btn-sm" type="submit">
              <LogOut className="h-3.5 w-3.5" /> تسجيل الخروج
            </button>
          </form>
        </header>
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="card w-full max-w-md p-7 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 ring-1 ring-inset ring-accent-600/30">
              {pending ? <Clock className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </span>
            <h1 className="mt-5 text-xl font-semibold text-white">
              {pending ? "سيتم إنشاء خططك خلال يومين" : "تم إيقاف وصولك"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {pending
                ? `أهلًا ${profile.full_name}. يمكنك رؤية خططك هنا فور الانتهاء من إعدادها.`
                : profile.status === "suspended"
                  ? "علّق FA COACHING حسابك مؤقتًا. تواصل مع مدربك لاستئناف التدريب."
                  : "حسابك غير نشط حاليًا. تواصل مع مدربك لإعادة تفعيله."}
            </p>
            <div className="mt-6 rounded-xl border border-ink-800 bg-ink-900/60 p-4 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                حسابك
              </p>
              <p className="mt-1.5 truncate text-sm text-zinc-200">{profile.full_name}</p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
            <form action={logoutAction} className="mt-5">
              <button className="btn-ghost w-full" type="submit">
                تسجيل الخروج
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const notifications = listNotifications(user.id, 8);
  const avatarPath = profile.avatar_path
    ? `/api/avatar/${user.id}?v=${encodeURIComponent(profile.updated_at)}`
    : null;

  return (
    <ClientShell
      name={profile.full_name}
      email={user.email}
      avatarPath={avatarPath}
      unread={unread}
      notifications={notifications}
    >
      {children}
    </ClientShell>
  );
}
