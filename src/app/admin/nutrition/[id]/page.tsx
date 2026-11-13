import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Users, UtensilsCrossed } from "lucide-react";
import { requireAssignedPlan } from "@/lib/auth";
import { getNutritionPlan, listClients } from "@/lib/data";
import {
  addMealAction,
  addMealItemAction,
  assignNutritionAction,
  deleteMealAction,
  deleteMealItemAction,
  deleteNutritionPlanAction,
  updateMealAction,
} from "@/app/actions/admin";
import { NutritionDetailsForm } from "@/components/admin-forms";
import { EmptyState, Field, PageHeader, SectionCard } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function NutritionPlanEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAssignedPlan("nutrition", id);
  const plan = getNutritionPlan(id);
  if (!plan) notFound();

  const clients = listClients({
    status: "active",
    managerUserId: session.user.admin_scope === "clients" ? session.user.id : undefined,
  });
  const meals = plan.meals ?? [];

  return (
    <div className="animate-fade-up">
      <Link
        href={session.user.admin_scope === "full" ? "/admin/nutrition" : "/admin/clients"}
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> العودة إلى خطط التغذية
      </Link>

      <PageHeader
        eyebrow={plan.is_template ? "قالب تغذية" : "نسخة خطة العميل"}
        title={plan.title}
        description={
          plan.is_template
            ? "تُطبّق التعديلات هنا على القالب. ويحصل كل عميل على نسخة خاصة عند تعيينها."
            : "هذه نسخة مخصصة لعميل واحد. لا تظهر التغييرات إلا لهذا العميل."
        }
        action={session.user.admin_scope === "full" ? (
          <form action={deleteNutritionPlanAction}>
            <input type="hidden" name="plan_id" value={plan.id} />
            <SubmitButton
              className="btn-danger btn-sm"
              confirm="هل تريد حذف خطة التغذية؟ لا يمكن التراجع عن هذا الإجراء."
              pendingLabel="جارٍ الحذف…"
            >
              <Trash2 className="h-3.5 w-3.5" /> حذف
            </SubmitButton>
          </form>
        ) : undefined}
      />

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5">
          <SectionCard title="إعدادات الخطة" description="الأهداف التي تظهر أعلى صفحة العميل.">
            <NutritionDetailsForm plan={plan} />
          </SectionCard>

          {plan.is_template ? (
            <SectionCard title="تعيين لعميل" description="ينشئ نسخة خاصة من هذا القالب.">
              {clients.length === 0 ? (
                <p className="text-sm text-zinc-500">لا يوجد عملاء نشطون حتى الآن.</p>
              ) : (
                <form action={assignNutritionAction} className="space-y-3">
                  <input type="hidden" name="plan_id" value={plan.id} />
                  <Field label="العميل" htmlFor="client_id">
                    <select id="client_id" name="client_id" required defaultValue="" className="input">
                      <option value="" disabled>
                        اختر عميلًا…
                      </option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.full_name} — {client.email}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <SubmitButton className="btn-primary btn-sm w-full" pendingLabel="جارٍ التعيين…">
                    <Users className="h-3.5 w-3.5" /> تعيين الخطة
                  </SubmitButton>
                </form>
              )}
            </SectionCard>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              الوجبات <span className="text-zinc-500">({meals.length})</span>
            </h2>
          </div>

          {meals.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed className="h-6 w-6" />}
              title="لم تتم إضافة وجبات"
              description="أضف الوجبة الأولى أدناه — ستظهر الوجبات بالترتيب في لوحة العميل."
            />
          ) : (
            <div className="space-y-4">
              {meals.map((meal) => (
                <section key={meal.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-sm font-bold text-accent-400 ring-1 ring-inset ring-accent-600/30">
                        {meal.meal_number}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{meal.title}</h3>
                        {meal.description ? (
                          <p className="mt-0.5 text-xs text-zinc-500">{meal.description}</p>
                        ) : null}
                      </div>
                    </div>
                    <form action={deleteMealAction}>
                      <input type="hidden" name="plan_id" value={plan.id} />
                      <input type="hidden" name="meal_id" value={meal.id} />
                      <SubmitButton
                        className="btn-ghost btn-sm text-red-300"
                        confirm="هل تريد حذف هذه الوجبة؟"
                        pendingLabel="…"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </SubmitButton>
                    </form>
                  </div>

                  <ul className="mt-4 space-y-1.5">
                    {meal.items.length === 0 ? (
                      <li className="rounded-lg border border-dashed border-ink-700 px-3 py-2 text-xs text-zinc-500">
                        لا توجد أطعمة بعد — أضف أول طعام أدناه.
                      </li>
                    ) : (
                      meal.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2"
                        >
                          <span className="min-w-0 text-sm text-zinc-200">
                            <span className="truncate">{item.food_name}</span>
                            {item.quantity ? (
                              <span className="mr-2 text-xs text-zinc-500">{item.quantity}</span>
                            ) : null}
                          </span>
                          <form action={deleteMealItemAction}>
                            <input type="hidden" name="plan_id" value={plan.id} />
                            <input type="hidden" name="item_id" value={item.id} />
                            <button
                              type="submit"
                              className="text-zinc-600 transition hover:text-red-400"
                              aria-label="حذف الطعام"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        </li>
                      ))
                    )}
                  </ul>

                  <form action={addMealItemAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <input type="hidden" name="meal_id" value={meal.id} />
                    <input
                      name="food_name"
                      required
                      placeholder="الطعام (مثال: دجاج مشوي)"
                      className="input flex-1"
                    />
                    <input name="quantity" placeholder="الكمية (200 جم)" className="input sm:w-40" />
                    <SubmitButton className="btn-ghost btn-sm shrink-0" pendingLabel="جارٍ الإضافة…">
                      <Plus className="h-3.5 w-3.5" /> إضافة
                    </SubmitButton>
                  </form>

                  <details className="mt-3 border-t border-ink-800 pt-3">
                    <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-300">
                      تعديل تفاصيل الوجبة
                    </summary>
                    <form action={updateMealAction} className="mt-3 space-y-3">
                      <input type="hidden" name="plan_id" value={plan.id} />
                      <input type="hidden" name="meal_id" value={meal.id} />
                      <div className="grid gap-3 sm:grid-cols-[80px_1fr]">
                        <Field label="رقم الوجبة" htmlFor={`n-${meal.id}`}>
                          <input
                            id={`n-${meal.id}`}
                            name="meal_number"
                            type="number"
                            min={1}
                            defaultValue={meal.meal_number}
                            className="input"
                          />
                        </Field>
                        <Field label="العنوان" htmlFor={`t-${meal.id}`}>
                          <input
                            id={`t-${meal.id}`}
                            name="title"
                            defaultValue={meal.title}
                            required
                            className="input"
                          />
                        </Field>
                      </div>
                      <Field label="الوصف" htmlFor={`d-${meal.id}`}>
                        <input
                          id={`d-${meal.id}`}
                          name="description"
                          defaultValue={meal.description ?? ""}
                          className="input"
                        />
                      </Field>
                      <SubmitButton className="btn-ghost btn-sm">حفظ الوجبة</SubmitButton>
                    </form>
                  </details>
                </section>
              ))}
            </div>
          )}

          <SectionCard title="إضافة وجبة" description="تُرقّم الوجبات وتُرتّب تلقائيًا.">
            <form action={addMealAction} className="space-y-3">
              <input type="hidden" name="plan_id" value={plan.id} />
              <div className="grid gap-3 sm:grid-cols-[100px_1fr]">
                <Field label="رقم الوجبة" htmlFor="meal_number">
                  <input
                    id="meal_number"
                    name="meal_number"
                    type="number"
                    min={1}
                    defaultValue={meals.length + 1}
                    className="input"
                  />
                </Field>
                <Field label="العنوان" htmlFor="meal-title">
                  <input
                    id="meal-title"
                    name="title"
                    required
                    className="input"
                    placeholder="الإفطار"
                  />
                </Field>
              </div>
              <Field label="الوصف" htmlFor="meal-description">
                <input id="meal-description" name="description" className="input" placeholder="ملاحظة اختيارية" />
              </Field>
              <SubmitButton className="btn-primary btn-sm" pendingLabel="جارٍ الإضافة…">
                <Plus className="h-3.5 w-3.5" /> إضافة وجبة
              </SubmitButton>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
