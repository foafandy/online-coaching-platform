import type { Metadata } from "next";
import { requireAdminAccess } from "@/lib/auth";
import { AdminShell } from "@/components/admin-nav";

export const metadata: Metadata = { title: "لوحة المدرب" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminAccess();
  return (
    <AdminShell
      name={session.user.display_name ?? "FA COACHING"}
      email={session.user.email}
      adminScope={session.user.admin_scope}
    >
      {children}
    </AdminShell>
  );
}
