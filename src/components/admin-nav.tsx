"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Apple,
  Dumbbell,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  Users,
  UserCog,
  X,
} from "lucide-react";
import { Brand } from "./brand";
import { logoutAction } from "@/app/actions/auth";
import type { AdminScope } from "@/lib/types";

const ITEMS = [
  { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/admin/clients", label: "العملاء", icon: Users },
  { href: "/admin/chats", label: "المحادثات", icon: MessageCircle },
  { href: "/admin/nutrition", label: "خطط التغذية", icon: Apple },
  { href: "/admin/workouts", label: "خطط التمارين", icon: Dumbbell },
  { href: "/admin/files", label: "الملفات والخطط", icon: FolderOpen },
  { href: "/admin/announcements", label: "الإعلانات", icon: Megaphone },
  { href: "/admin/team", label: "فريق الإدارة", icon: UserCog },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  onNavigate,
  adminScope,
}: {
  onNavigate?: () => void;
  adminScope: AdminScope | null;
}) {
  const pathname = usePathname();
  const visibleItems =
    adminScope === "clients"
      ? ITEMS.filter((item) => ["/admin/clients", "/admin/chats"].includes(item.href))
      : ITEMS;
  return (
    <nav className="space-y-1">
      {visibleItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-accent-500/10 text-accent-400 ring-1 ring-inset ring-accent-600/30"
                : "text-zinc-400 hover:bg-ink-800 hover:text-zinc-100"
            }`}
          >
            <item.icon className="h-4 w-4" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutForm() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 transition hover:bg-ink-800 hover:text-zinc-200"
      >
        <LogOut className="h-4 w-4" />
        تسجيل الخروج
      </button>
    </form>
  );
}

export function AdminShell({
  name,
  email,
  adminScope,
  children,
}: {
  name: string;
  email: string;
  adminScope: AdminScope | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-l border-ink-800 bg-ink-950/60 px-4 py-6 backdrop-blur lg:flex">
        <Brand href="/admin" />
        <div className="mt-8 flex-1">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
            {adminScope === "clients" ? "إدارة العملاء" : "لوحة المدرب"}
          </p>
          <NavLinks adminScope={adminScope} />
        </div>
        <div className="rounded-xl border border-ink-800 bg-ink-900/70 p-3">
          <p className="truncate text-sm font-medium text-zinc-200">{name}</p>
          <p className="truncate text-xs text-zinc-500">{email}</p>
          <LogoutForm />
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink-800 bg-ink-900/90 px-4 py-3 backdrop-blur lg:hidden">
          <Brand href="/admin" compact />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl border border-ink-700 p-2 text-zinc-300"
            aria-label="فتح القائمة"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 w-[280px] animate-fade-in border-l border-ink-700 bg-ink-950 p-5">
              <div className="mb-6 flex items-center justify-between">
                <Brand href="/admin" compact />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-ink-700 p-1.5 text-zinc-400"
                  aria-label="إغلاق القائمة"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <NavLinks adminScope={adminScope} onNavigate={() => setOpen(false)} />
              <div className="mt-6 border-t border-ink-800 pt-4">
                <p className="truncate px-3 text-sm text-zinc-300">{name}</p>
                <p className="truncate px-3 text-xs text-zinc-500">{email}</p>
                <LogoutForm />
              </div>
            </div>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {children}
        </main>
        <Link
          href="/admin/chats"
          aria-label="فتح محادثات المتدربين"
          title="محادثات المتدربين"
          className="fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent-500 text-ink-950 shadow-xl shadow-black/40 transition hover:scale-105 hover:bg-accent-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-400"
        >
          <MessageCircle className="h-6 w-6" strokeWidth={2.2} />
        </Link>
      </div>
    </div>
  );
}
