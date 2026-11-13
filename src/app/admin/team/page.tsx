import { requireAdmin } from "@/lib/auth";
import { listClientManagers, listClients, listManagerClientIds } from "@/lib/data";
import {
  deleteClientManagerAction,
  saveClientManagerAssignmentsAction,
} from "@/app/actions/team";
import { TeamForm } from "@/components/team-form";
import { PageHeader, SectionCard, formatDate } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  await requireAdmin();
  const managers = listClientManagers();
  const clients = listClients();
  const assignments = new Map(
    managers.map((manager) => [manager.id, new Set(listManagerClientIds(manager.id))]),
  );

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        eyebrow="إدارة الصلاحيات"
        title="فريق إدارة العملاء"
        description="أنشئ حسابات للفريق وحدد لكل متدرب مسؤولًا واحدًا يستطيع الاطلاع على بياناته وإدارة خططه وملفاته."
      />

      <SectionCard title="إضافة مسؤول إدارة عملاء">
        <div className="max-w-xl">
          <TeamForm />
        </div>
      </SectionCard>

      <SectionCard title={`الحسابات الحالية (${managers.length})`}>
        {managers.length === 0 ? (
          <p className="text-sm text-zinc-500">لم تتم إضافة مسؤولين بعد.</p>
        ) : (
          <ul className="space-y-4">
            {managers.map((manager) => (
              <li
                key={manager.id}
                className="rounded-xl border border-ink-800 bg-ink-900/50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {manager.display_name ?? manager.email}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {manager.email} · أُضيف {formatDate(manager.created_at)}
                    </p>
                  </div>
                  <form action={deleteClientManagerAction}>
                    <input type="hidden" name="user_id" value={manager.id} />
                    <SubmitButton
                      className="btn-danger btn-sm"
                      confirm={`هل تريد إلغاء صلاحية ${manager.display_name ?? manager.email}؟`}
                      pendingLabel="جارٍ الإلغاء…"
                    >
                      إلغاء الحساب
                    </SubmitButton>
                  </form>
                </div>

                <form action={saveClientManagerAssignmentsAction} className="mt-4">
                  <input type="hidden" name="user_id" value={manager.id} />
                  <p className="mb-2 text-xs font-semibold text-zinc-300">
                    المتدربون المعيّنون
                  </p>
                  {clients.length ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {clients.map((client) => (
                        <label
                          key={client.id}
                          className="flex items-center gap-2 rounded-lg border border-ink-800 px-3 py-2 text-xs text-zinc-300"
                        >
                          <input
                            type="checkbox"
                            name="client_ids"
                            value={client.id}
                            defaultChecked={assignments.get(manager.id)?.has(client.id) ?? false}
                            className="accent-accent-500"
                          />
                          <span className="truncate">
                            {client.full_name} · {client.email}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">لا يوجد متدربون مسجلون بعد.</p>
                  )}
                  <div className="mt-3">
                    <SubmitButton className="btn-primary btn-sm" pendingLabel="جارٍ حفظ التعيينات…">
                      حفظ المتدربين
                    </SubmitButton>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
