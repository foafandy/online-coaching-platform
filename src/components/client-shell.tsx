"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Apple,
  Bell,
  CheckCheck,
  Dumbbell,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  User,
} from "lucide-react";
import { Brand } from "./brand";
import { logoutAction } from "@/app/actions/auth";
import { markNotificationsReadAction } from "@/app/actions/client";
import { timeAgo } from "./ui";

const ITEMS = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/dashboard/nutrition", label: "التغذية", icon: Apple },
  { href: "/dashboard/workouts", label: "التمارين", icon: Dumbbell },
  { href: "/dashboard/files", label: "الملفات", icon: FolderOpen },
  { href: "/dashboard/chat", label: "الشات", icon: MessageCircle },
  { href: "/dashboard/profile", label: "حسابي", icon: User },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ClientShell({
  name,
  email,
  avatarPath,
  unread,
  notifications,
  children,
}: {
  name: string;
  email: string;
  avatarPath: string | null;
  unread: number;
  notifications: Array<{
    id: string;
    title: string;
    body: string | null;
    link: string | null;
    is_read: number;
    created_at: string;
  }>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-l border-ink-800 bg-ink-950/60 px-4 py-6 backdrop-blur lg:flex">
        <Brand href="/dashboard" compact />
        <nav className="mt-9 flex-1 space-y-1">
          {ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-accent-500/10 text-accent-400 ring-1 ring-inset ring-accent-600/30"
                    : "text-zinc-400 hover:bg-ink-800 hover:text-zinc-100"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.href === "/dashboard" && unread > 0 ? (
                  <span className="ml-auto rounded-full bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold text-ink-950">
                    {unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-xl border border-ink-800 bg-ink-900/70 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={name} path={avatarPath} initials={initials} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-200">{name}</p>
              <p className="truncate text-[11px] text-zinc-500">{email}</p>
            </div>
          </div>
          <form action={logoutAction} className="mt-3 border-t border-ink-800 pt-2">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-zinc-500 transition hover:bg-ink-800 hover:text-zinc-200"
            >
              <LogOut className="h-3.5 w-3.5" /> تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink-800 bg-ink-900/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
          <div className="lg:hidden">
            <Brand href="/dashboard" compact />
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-zinc-300">أهلًا بعودتك، {name.split(" ")[0]}</p>
            <p className="text-xs text-zinc-500">منصة التدريب الخاصة بك</p>
          </div>
          <div className="flex items-center gap-2">
            <details className="group relative">
              <summary aria-label="الإشعارات" className="relative flex cursor-pointer list-none items-center justify-center rounded-xl border border-ink-700 bg-ink-850 p-2.5 text-zinc-300 transition hover:border-ink-600 [&::-webkit-details-marker]:hidden">
                <Bell className="h-4 w-4" />
                {unread > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-ink-950">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </summary>
              <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    الإشعارات
                  </p>
                  {unread > 0 ? (
                    <form action={markNotificationsReadAction}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-400 hover:underline"
                      >
                        <CheckCheck className="h-3 w-3" /> تحديد كمقروء
                      </button>
                    </form>
                  ) : null}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-zinc-500">
                      لا توجد إشعارات حتى الآن.
                    </p>
                  ) : (
                    notifications.map((item) =>
                      item.link ? (
                        <Link
                          key={item.id}
                          href={item.link}
                          className={`block border-b border-ink-800/70 px-4 py-3 last:border-0 transition hover:bg-ink-850 ${
                            item.is_read ? "" : "bg-accent-500/[0.04]"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {item.is_read ? null : (
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                              {item.body ? (
                                <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                                  {item.body}
                                </p>
                              ) : null}
                              <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                                {timeAgo(item.created_at)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div
                          key={item.id}
                          className={`border-b border-ink-800/70 px-4 py-3 last:border-0 ${
                            item.is_read ? "" : "bg-accent-500/[0.04]"
                          }`}
                        >
                          <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                          {item.body ? (
                            <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{item.body}</p>
                          ) : null}
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>
            </details>
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-850 py-1.5 pr-1.5 pl-3 text-xs font-medium text-zinc-300"
            >
              <Avatar name={name} path={avatarPath} initials={initials} size={26} />
              <span className="max-w-[90px] truncate">{name.split(" ")[0]}</span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-800 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="grid grid-cols-6">
            {ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${
                    active ? "text-accent-400" : "text-zinc-500"
                  }`}
                >
                  <item.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <Link
          href="/dashboard/chat"
          aria-label="فتح الشات مع المسؤول"
          title="الشات مع المسؤول"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent-500 text-ink-950 shadow-xl shadow-black/40 transition hover:scale-105 hover:bg-accent-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-400 lg:bottom-6"
        >
          <MessageCircle className="h-6 w-6" strokeWidth={2.2} />
        </Link>
      </div>
    </div>
  );
}

function Avatar({
  name,
  path,
  initials,
  size = 36,
}: {
  name: string;
  path: string | null;
  initials: string;
  size?: number;
}) {
  if (path) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={path}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover ring-1 ring-ink-600"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-[11px] font-bold text-accent-400 ring-1 ring-accent-600/30"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}
