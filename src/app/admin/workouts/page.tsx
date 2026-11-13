import Link from "next/link";
import { Copy, Dumbbell, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listWorkoutPlans } from "@/lib/data";
import { createWorkoutPlanAction } from "@/app/actions/admin";
import { EmptyState, Field, Flash, PageHeader, formatDate } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminWorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const plans = listWorkoutPlans();
  const templates = plans.filter((plan) => plan.is_template === 1);
  const copies = plans.filter((plan) => plan.is_template === 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="مكتبة المحتوى"
        title="برامج التمارين"
        description="أنشئ برامج التدريب يومًا بيوم، ثم عيّن نسخة لأي عميل."
      />

      <Flash message={params.deleted ? "تم حذف البرنامج." : undefined} />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-800 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-white">القوالب</h2>
                <p className="text-xs text-zinc-500">برامج تدريب قابلة لإعادة الاستخدام.</p>
              </div>
              <span className="badge border-ink-600 bg-ink-800 text-zinc-400">
                {templates.length}
              </span>
            </div>
            {templates.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<Dumbbell className="h-6 w-6" />}
                  title="لا توجد قوالب تمارين حتى الآن"
                  description="أنشئ برنامجك الأول باستخدام النموذج الجانبي."
                />
              </div>
            ) : (
              <ul className="divide-y divide-ink-800">
                {templates.map((plan) => (
                  <li
                    key={plan.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-ink-800/30"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/workouts/${plan.id}`}
                        className="text-sm font-medium text-white hover:text-accent-400"
                      >
                        {plan.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {plan.split_type ?? "تقسيم مخصص"} · {plan.day_count} أيام · آخر تحديث{" "}
                        {formatDate(plan.updated_at)}
                      </p>
                    </div>
                    <Link href={`/admin/workouts/${plan.id}`} className="btn-ghost btn-sm">
                      تعديل البرنامج
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-800 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-white">النسخ المعيّنة</h2>
                <p className="text-xs text-zinc-500">نسخ برامج مخصصة للعملاء.</p>
              </div>
              <span className="badge border-ink-600 bg-ink-800 text-zinc-400">{copies.length}</span>
            </div>
            {copies.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">
                لم يتم تعيين أي برنامج بعد. عيّن البرامج من ملف العميل.
              </p>
            ) : (
              <ul className="divide-y divide-ink-800">
                {copies.map((plan) => (
                  <li
                    key={plan.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/workouts/${plan.id}`}
                        className="flex items-center gap-2 text-sm text-zinc-200 hover:text-accent-400"
                      >
                        <Copy className="h-3.5 w-3.5 text-zinc-600" />
                        <span className="truncate">{plan.title}</span>
                      </Link>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {plan.client_name ? `للعميل ${plan.client_name}` : "غير معيّن حاليًا"} ·{" "}
                        {plan.day_count} أيام
                      </p>
                    </div>
                    <Link href={`/admin/workouts/${plan.id}`} className="btn-ghost btn-sm">
                      فتح
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside>
          <form action={createWorkoutPlanAction} className="card space-y-4 p-5">
            <div>
              <h2 className="text-sm font-semibold text-white">قالب تمارين جديد</h2>
              <p className="mt-1 text-xs text-zinc-500">أضف الأيام والتمارين بعد إنشائه مباشرةً.</p>
            </div>
            <Field label="عنوان البرنامج" htmlFor="title">
              <input
                id="title"
                name="title"
                required
                className="input"
                placeholder="دفع وسحب وأرجل — 5 أيام"
              />
            </Field>
            <Field label="نوع التقسيم" htmlFor="split_type">
              <input id="split_type" name="split_type" className="input" placeholder="دفع / سحب / أرجل" />
            </Field>
            <Field label="الوصف" htmlFor="description">
              <textarea id="description" name="description" rows={2} className="input resize-y" />
            </Field>
            <Field label="ملاحظات البرنامج" htmlFor="notes">
              <textarea id="notes" name="notes" rows={2} className="input resize-y" />
            </Field>
            <SubmitButton className="btn-primary w-full" pendingLabel="جارٍ الإنشاء…">
              <Plus className="h-4 w-4" /> إنشاء القالب
            </SubmitButton>
          </form>
        </aside>
      </div>
    </div>
  );
}
