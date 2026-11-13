import Link from "next/link";
import {
  Apple,
  ArrowRight,
  Dumbbell,
  FolderOpen,
  Megaphone,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { countAll, getClientStats, getRecentActivity, listClients } from "@/lib/data";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  formatDate,
  timeAgo,
} from "@/components/ui";
import { setClientStatus } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdmin();
  const stats = getClientStats();
  const counts = countAll();
  const pending = listClients({ status: "pending" }).slice(0, 4);
  const activity = getRecentActivity(6);
  const activityKinds: Record<string, string> = {
    file: "ملف",
    client: "عميل",
    assignment: "خطة معيّنة",
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="لوحة المدرب"
        title="نظرة عامة"
        description="عملاؤك ومكتبة المحتوى وما يحتاج إلى اهتمام اليوم."
        action={
          <Link href="/admin/clients" className="btn-ghost btn-sm">
            كل العملاء <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="إجمالي العملاء" value={stats.total} hint="كل الحسابات المسجلة" />
        <StatCard label="نشطون" value={stats.active} tone="accent" hint="يتدربون معك" />
        <StatCard label="قيد المراجعة" value={stats.pending} tone="warn" hint="بانتظار التفعيل" />
        <StatCard label="غير نشطين / موقوفون" value={stats.inactive} tone="muted" hint="لا يملكون صلاحية دخول حاليًا" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Link href="/admin/nutrition" className="card group flex items-center gap-4 p-5 transition hover:border-accent-600/40">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-800 text-accent-500">
            <Apple className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">خطط التغذية</p>
            <p className="text-xs text-zinc-500">{counts.nutritionPlans} خطة</p>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-accent-500" />
        </Link>
        <Link href="/admin/workouts" className="card group flex items-center gap-4 p-5 transition hover:border-accent-600/40">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-800 text-accent-500">
            <Dumbbell className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">برامج التمارين</p>
            <p className="text-xs text-zinc-500">{counts.workoutPlans} برنامج</p>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-accent-500" />
        </Link>
        <Link href="/admin/files" className="card group flex items-center gap-4 p-5 transition hover:border-accent-600/40">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-800 text-accent-500">
            <FolderOpen className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">الملفات</p>
            <p className="text-xs text-zinc-500">{counts.files} ملف مرفوع</p>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-accent-500" />
        </Link>
        <Link href="/admin/announcements" className="card group flex items-center gap-4 p-5 transition hover:border-accent-600/40">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-800 text-accent-500">
            <Megaphone className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">الإعلانات</p>
            <p className="text-xs text-zinc-500">{counts.announcements} إعلان منشور</p>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-accent-500" />
        </Link>
      </div>

      {pending.length > 0 ? (
        <div className="mt-6">
          <SectionCard
            title="بانتظار التفعيل"
            description="لا يمكن للعملاء الجدد الاطلاع على الخطط قبل تفعيل حساباتهم."
            action={
              <Link href="/admin/clients?status=pending" className="btn-ghost btn-sm">
                عرض الكل
              </Link>
            }
          >
            <ul className="divide-y divide-ink-800">
              {pending.map((client) => (
                <li key={client.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-800 text-xs font-bold text-zinc-300">
                      {client.full_name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-sm font-medium text-white hover:text-accent-400"
                      >
                        {client.full_name}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        {client.email} · تاريخ التسجيل {formatDate(client.created_at)}
                      </p>
                    </div>
                  </div>
                  <form action={setClientStatus} className="flex items-center gap-2">
                    <input type="hidden" name="client_id" value={client.id} />
                    <input type="hidden" name="status" value="active" />
                    <button type="submit" className="btn-primary btn-sm">
                      تفعيل
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title="المسجلون حديثًا"
          description="أحدث الحسابات التي أُنشئت على المنصة."
          action={
            <Link href="/admin/clients?new=1" className="btn-ghost btn-sm">
              <Plus className="h-3.5 w-3.5" /> دعوة
            </Link>
          }
        >
          {stats.recent.length === 0 ? (
            <EmptyState
              icon={<UserPlus className="h-6 w-6" />}
              title="لا يوجد عملاء حتى الآن"
              description="شارك رابط التسجيل وسيظهر العملاء الجدد هنا."
            />
          ) : (
            <div className="table-wrap -mx-2">
              <table className="table">
                <thead>
                  <tr>
                    <th>العميل</th>
                    <th>الحالة</th>
                    <th>تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="font-medium text-white hover:text-accent-400"
                        >
                          {client.full_name}
                        </Link>
                        <p className="text-xs text-zinc-500">{client.email}</p>
                      </td>
                      <td>
                        <StatusBadge status={client.status} />
                      </td>
                      <td className="whitespace-nowrap text-xs text-zinc-400">
                        {formatDate(client.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="أحدث النشاطات" description="الملفات والعملاء والخطط المعيّنة.">
          {activity.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="لا يوجد نشاط حتى الآن" />
          ) : (
            <ul className="space-y-3.5">
              {activity.map((item, index) => (
                <li key={`${item.kind}-${index}`} className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-200">{item.label}</p>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-zinc-600">
                      {activityKinds[item.kind] ?? item.kind} · {timeAgo(item.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
