import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { getClientActivePlans } from "@/lib/data";
import { PrintButton } from "@/components/print-button";
import { Brand } from "@/components/brand";
import { formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "ملف خطة التغذية PDF" };

export default async function NutritionPrintPage() {
  const { profile } = await requireClient();
  const { nutrition } = getClientActivePlans(profile.id);

  if (!nutrition) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-sm text-zinc-300">لم يتم تعيين خطة تغذية لحسابك حتى الآن.</p>
        <Link href="/dashboard/nutrition" className="btn-ghost btn-sm mt-4">
          العودة إلى التغذية
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-900 print:bg-white">
      <div className="no-print mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
        <Link href="/dashboard/nutrition" className="btn-ghost btn-sm">
          <ArrowLeft className="h-3.5 w-3.5" /> رجوع
        </Link>
        <div className="flex items-center gap-2">
          <p className="hidden text-xs text-zinc-500 sm:block">
            اختر «حفظ كملف PDF» من نافذة الطباعة.
          </p>
          <PrintButton />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 pb-12 print:px-0">
        <article className="rounded-2xl border border-ink-700 bg-ink-850 p-7 print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black">
          <header className="flex items-start justify-between gap-4 border-b border-ink-700 pb-5 print:border-neutral-300">
            <div>
              <p className="font-display text-xl tracking-[0.14em] text-white print:text-black">
                FA COACHING
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500 print:text-neutral-500">
                التدريب الاحترافي أونلاين
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 print:text-neutral-500">
                خطة التغذية
              </p>
              <p className="mt-0.5 text-sm text-zinc-300 print:text-neutral-700">
                {formatDate(nutrition.updated_at)}
              </p>
            </div>
          </header>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white print:text-black">
                {nutrition.title}
              </h1>
              <p className="mt-1 text-sm text-zinc-400 print:text-neutral-600">
                مُعدّة لـ {profile.full_name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 print:text-neutral-500">
                الهدف اليومي
              </p>
              <p className="text-2xl font-semibold text-accent-400 print:text-black">
                {nutrition.calories ?? "—"} سعرة
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ["البروتين", nutrition.protein_g],
              ["الكربوهيدرات", nutrition.carbs_g],
              ["الدهون", nutrition.fats_g],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3 print:border-neutral-300 print:bg-white"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500 print:text-neutral-500">
                  {label}
                </p>
                <p className="mt-0.5 text-lg font-semibold text-white print:text-black">
                  {value ?? "—"}
                  {value != null ? " جم" : ""}
                </p>
              </div>
            ))}
          </div>

          {nutrition.description ? (
            <p className="mt-5 text-sm leading-relaxed text-zinc-400 print:text-neutral-700">
              {nutrition.description}
            </p>
          ) : null}

          <section className="mt-7">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 print:text-neutral-500">
              خطة الوجبات
            </h2>
            <div className="mt-3 space-y-4">
              {(nutrition.meals ?? []).map((meal) => (
                <div
                  key={meal.id}
                  className="rounded-xl border border-ink-700 p-4 print:break-inside-avoid print:border-neutral-300"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-white print:text-black">
                      الوجبة {meal.meal_number} — {meal.title}
                    </p>
                    {meal.description ? (
                      <p className="text-xs text-zinc-500 print:text-neutral-600">{meal.description}</p>
                    ) : null}
                  </div>
                  <table className="mt-2 w-full text-sm">
                    <tbody>
                      {meal.items.map((item) => (
                        <tr key={item.id} className="border-t border-ink-800/70 print:border-neutral-200">
                          <td className="py-1.5 text-zinc-300 print:text-neutral-800">
                            {item.food_name}
                          </td>
                          <td className="py-1.5 text-right text-zinc-500 print:text-neutral-600">
                            {item.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>

          {nutrition.notes ? (
            <section className="mt-6 rounded-xl border border-ink-700 bg-ink-900/40 p-4 print:border-neutral-300 print:bg-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-500 print:text-neutral-500">
                ملاحظات المدرب
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-zinc-300 print:text-neutral-800">
                {nutrition.notes}
              </p>
            </section>
          ) : null}

          <footer className="mt-8 border-t border-ink-700 pt-4 text-[10px] uppercase tracking-[0.14em] text-zinc-600 print:border-neutral-300 print:text-neutral-500">
            FA COACHING · تغذية مخصصة · خاص بك، يُرجى عدم مشاركته
          </footer>
        </article>

        <div className="no-print mt-6 flex justify-center">
          <Brand href="/dashboard" compact />
        </div>
      </div>
    </div>
  );
}
