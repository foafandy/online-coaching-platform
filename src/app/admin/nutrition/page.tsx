import Link from "next/link";
import { Apple, Copy, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listNutritionPlans } from "@/lib/data";
import { createNutritionPlanAction } from "@/app/actions/admin";
import { EmptyState, Field, Flash, PageHeader, formatDate } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminNutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const plans = listNutritionPlans();
  const templates = plans.filter((plan) => plan.is_template === 1);
  const copies = plans.filter((plan) => plan.is_template === 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="مكتبة المحتوى"
        title="خطط التغذية"
        description="أنشئ قوالب قابلة لإعادة الاستخدام، ثم عيّن نسخة خاصة لكل عميل."
      />

      <Flash message={params.deleted ? "تم حذف الخطة." : undefined} />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-800 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-white">القوالب</h2>
                <p className="text-xs text-zinc-500">قابلة لإعادة الاستخدام مع جميع العملاء.</p>
              </div>
              <span className="badge border-ink-600 bg-ink-800 text-zinc-400">
                {templates.length}
              </span>
            </div>
            {templates.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<Apple className="h-6 w-6" />}
                  title="لا توجد قوالب تغذية حتى الآن"
                  description="أنشئ خطتك الأولى باستخدام النموذج الجانبي."
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
                        href={`/admin/nutrition/${plan.id}`}
                        className="text-sm font-medium text-white hover:text-accent-400"
                      >
                        {plan.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {plan.calories ? `${plan.calories} سعرة` : "لا توجد أهداف"} · {plan.meal_count}{" "}
                        وجبات · آخر تحديث {formatDate(plan.updated_at)}
                      </p>
                    </div>
                    <Link href={`/admin/nutrition/${plan.id}`} className="btn-ghost btn-sm">
                      تعديل الخطة
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
                <p className="text-xs text-zinc-500">نسخ مخصصة للعملاء من قوالبك.</p>
              </div>
              <span className="badge border-ink-600 bg-ink-800 text-zinc-400">{copies.length}</span>
            </div>
            {copies.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">
                لم يتم تعيين أي خطة بعد. افتح ملف عميل لتعيين خطة تغذية.
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
                        href={`/admin/nutrition/${plan.id}`}
                        className="flex items-center gap-2 text-sm text-zinc-200 hover:text-accent-400"
                      >
                        <Copy className="h-3.5 w-3.5 text-zinc-600" />
                        <span className="truncate">{plan.title}</span>
                      </Link>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {plan.client_name ? `للعميل ${plan.client_name}` : "غير معيّنة حاليًا"} ·{" "}
                        {plan.meal_count} وجبات
                      </p>
                    </div>
                    <Link href={`/admin/nutrition/${plan.id}`} className="btn-ghost btn-sm">
                      فتح
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside>
          <form action={createNutritionPlanAction} className="card space-y-4 p-5">
            <div>
              <h2 className="text-sm font-semibold text-white">قالب تغذية جديد</h2>
              <p className="mt-1 text-xs text-zinc-500">
                يمكنك إضافة الوجبات والأطعمة بعد إنشائه مباشرةً.
              </p>
            </div>
            <Field label="عنوان الخطة" htmlFor="title">
              <input
                id="title"
                name="title"
                required
                className="input"
                placeholder="خطة خفض الدهون — 2200 سعرة"
              />
            </Field>
            <Field label="الوصف" htmlFor="description">
              <textarea id="description" name="description" rows={2} className="input resize-y" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="السعرات" htmlFor="calories">
                <input id="calories" name="calories" type="number" min={0} className="input" placeholder="2200" />
              </Field>
              <Field label="البروتين (جم)" htmlFor="protein_g">
                <input id="protein_g" name="protein_g" type="number" min={0} className="input" placeholder="190" />
              </Field>
              <Field label="الكربوهيدرات (جم)" htmlFor="carbs_g">
                <input id="carbs_g" name="carbs_g" type="number" min={0} className="input" placeholder="210" />
              </Field>
              <Field label="الدهون (جم)" htmlFor="fats_g">
                <input id="fats_g" name="fats_g" type="number" min={0} className="input" placeholder="60" />
              </Field>
            </div>
            <Field label="ملاحظات المدرب" htmlFor="notes">
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
