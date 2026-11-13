import Link from "next/link";
import { MessageCircle, Search, SlidersHorizontal, UserPlus } from "lucide-react";
import { requireClientManager } from "@/lib/auth";
import { FIRST_MONTH_END_WINDOW_DAYS, listClientManagers, listClients } from "@/lib/data";
import { setClientStatus } from "@/app/actions/admin";
import { assignClientManagerAction } from "@/app/actions/team";
import {
  EmptyState,
  Flash,
  PageHeader,
  StatusBadge,
  formatDate,
} from "@/components/ui";
import { CLIENT_STATUS_LABELS, type ClientStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS: Array<{ label: string; value: string }> = [
  { label: "الكل", value: "all" },
  { label: "قيد المراجعة", value: "pending" },
  { label: "نشط", value: "active" },
  { label: "غير نشط", value: "inactive" },
  { label: "موقوف", value: "suspended" },
];

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; deleted?: string; renewal?: string }>;
}) {
  const session = await requireClientManager();
  const managerUserId = session.user.admin_scope === "clients" ? session.user.id : undefined;
  const managers =
    session.user.admin_scope === "full" ? listClientManagers() : [];
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "all";
  const renewal = params.renewal === "1";
  const clients = listClients({ search: q, status, nearFirstMonthEnd: renewal, managerUserId });
  const activeCount = listClients({ status: "active", managerUserId }).length;
  const renewalCount = listClients({ nearFirstMonthEnd: true, managerUserId }).length;

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="قائمة العملاء"
        title="العملاء"
        description={
          renewal
            ? `المتدربون النشطون الذين يكتمل شهرهم الأول خلال ${FIRST_MONTH_END_WINDOW_DAYS} أيام: ${clients.length}.`
            : `المعروض: ${clients.length} · النشطون على المنصة: ${activeCount}.`
        }
      />

      <Flash message={params.deleted ? "تم حذف حساب العميل." : undefined} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-600/25 bg-accent-500/5 p-3 sm:p-4">
        <div>
          <p className="text-sm font-semibold text-white">تجديد خطط المتدربين</p>
          <p className="mt-1 text-xs text-zinc-400">
            يعرض المتدربين النشطين خلال آخر {FIRST_MONTH_END_WINDOW_DAYS} أيام من شهرهم الأول.
          </p>
        </div>
        <Link
          href={renewal ? "/admin/clients" : "/admin/clients?renewal=1"}
          className={renewal ? "btn-ghost btn-sm" : "btn-primary btn-sm"}
        >
          {renewal ? "عرض كل المتدربين" : `قرب موعد الخطة الجديدة (${renewalCount})`}
        </Link>
      </div>

      <div className="card mb-5 p-3 sm:p-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-center" action="/admin/clients">
          {renewal ? <input type="hidden" name="renewal" value="1" /> : null}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="ابحث بالاسم أو البريد الإلكتروني…"
              className="input pr-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <select name="status" defaultValue={status} className="input min-w-[150px] pr-8">
                {FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary btn-sm px-4 py-2.5">
              تصفية
            </button>
          </div>
        </form>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-6 w-6" />}
          title={
            renewal
              ? "لا يوجد متدربون قرب نهاية شهرهم الأول"
              : q
                ? "لا يوجد عملاء يطابقون بحثك"
                : "لا يوجد عملاء في هذا العرض"
          }
          description={
            renewal
              ? `سيظهر هنا المتدربون النشطون خلال آخر ${FIRST_MONTH_END_WINDOW_DAYS} أيام من شهرهم الأول.`
              : q
                ? "جرّب البحث باسم أو بريد إلكتروني آخر."
                : "ستظهر التسجيلات الجديدة هنا تلقائيًا. شارك /register لدعوة عميل."
          }
          action={
            q || renewal ? (
              <Link href="/admin/clients" className="btn-ghost btn-sm">
                مسح عوامل التصفية
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrap">
            <table className="table min-w-[1220px]">
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>الحالة</th>
                  <th>الهدف</th>
                  <th>بيانات البداية</th>
                  <th>بداية الاشتراك</th>
                  <th>نهاية الشهر الأول</th>
                  <th>تاريخ التسجيل</th>
                  <th>مسؤول المتدرب</th>
                  <th className="text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-800 text-[11px] font-bold text-zinc-300">
                          {client.full_name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/clients/${client.id}`}
                            className="block truncate font-medium text-white hover:text-accent-400"
                          >
                            {client.full_name}
                          </Link>
                          <p className="truncate text-xs text-zinc-500">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={client.status as ClientStatus} />
                    </td>
                    <td className="max-w-[220px]">
                      <p className="truncate text-xs text-zinc-400">{client.goal ?? "—"}</p>
                    </td>
                    <td>
                      <span className={client.onboarding_submitted_at ? "text-xs text-emerald-400" : "text-xs text-amber-400"}>
                        {client.onboarding_submitted_at ? "مكتملة" : "بانتظار المتدرب"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs text-zinc-400">
                      {client.subscription_started_at
                        ? formatDate(client.subscription_started_at)
                        : "بانتظار التفعيل"}
                    </td>
                    <td className="whitespace-nowrap text-xs text-zinc-400">
                      {client.subscription_due_at ? formatDate(client.subscription_due_at) : "—"}
                    </td>
                    <td className="whitespace-nowrap text-xs text-zinc-400">
                      {formatDate(client.created_at)}
                    </td>
                    <td className="min-w-[220px]">
                      {session.user.admin_scope === "full" ? (
                        <form action={assignClientManagerAction} className="flex items-center gap-2">
                          <input type="hidden" name="client_id" value={client.id} />
                          <label className="sr-only" htmlFor={`manager-${client.id}`}>
                            مسؤول المتدرب {client.full_name}
                          </label>
                          <select
                            id={`manager-${client.id}`}
                            name="manager_user_id"
                            defaultValue={client.client_manager_user_id ?? ""}
                            className="input min-w-0 flex-1 py-2 text-xs"
                          >
                            <option value="">بدون مسؤول</option>
                            {managers.map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {manager.display_name ?? manager.email}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="btn-primary btn-sm whitespace-nowrap">
                            حفظ
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-accent-400">
                          {client.client_manager_names ?? "غير معيّن"}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/clients/${client.id}/chat`}
                          className="btn-ghost btn-sm"
                          aria-label={`محادثة ${client.full_name}`}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Link>
                        <Link href={`/admin/clients/${client.id}`} className="btn-ghost btn-sm">
                          فتح
                        </Link>
                        <form action={setClientStatus}>
                          <input type="hidden" name="client_id" value={client.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={client.status === "active" ? "inactive" : "active"}
                          />
                          <button
                            type="submit"
                            className={
                              client.status === "active"
                                ? "btn-ghost btn-sm text-amber-300"
                                : "btn-primary btn-sm"
                            }
                          >
                            {client.status === "active" ? "إلغاء التفعيل" : "تفعيل"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-500">
        الحالات:{" "}
        {Object.entries(CLIENT_STATUS_LABELS)
          .map(([key, label]) => `${label} (${key})`)
          .join(" · ")}
      </p>
    </div>
  );
}
