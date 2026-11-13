import Link from "next/link";
import { Apple, ArrowLeft, ChefHat, Flame, Printer } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { getClientActivePlans } from "@/lib/data";
import { EmptyState, MacroPill, PageHeader, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClientNutritionPage() {
  const { profile } = await requireClient();
  const { nutrition } = getClientActivePlans(profile.id);

  if (!nutrition) {
    return (
      <div className="animate-fade-up">
        <PageHeader eyebrow="التغذية" title="خطتي الغذائية" />
        <EmptyState
          icon={<Apple className="h-6 w-6" />}
          title="لم يتم تعيين خطة تغذية بعد"
          description="ستظهر خطتك هنا فور نشرها من FA COACHING، مع السعرات والعناصر الغذائية وكل وجبة."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> لوحة التحكم
        </Link>
        <PageHeader
          eyebrow="خطة التغذية"
          title={nutrition.title}
          description={nutrition.description ?? undefined}
          action={
            <Link href="/print/nutrition" className="btn-primary btn-sm">
              <Printer className="h-3.5 w-3.5" /> تنزيل PDF
            </Link>
          }
        />
      </div>

      <section className="card overflow-hidden">
        <div className="relative border-b border-ink-800 p-6">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent-500/10 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                <Flame className="h-3 w-3 text-accent-500" /> السعرات المستهدفة يوميًا
              </p>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-white">
                {nutrition.calories ?? "—"}
                <span className="mr-1.5 text-sm font-medium text-zinc-500">سعرة</span>
              </p>
            </div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-600">
              آخر تحديث: {formatDate(nutrition.updated_at)}
            </p>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2.5">
            <MacroPill label="البروتين" value={nutrition.protein_g} />
            <MacroPill label="الكربوهيدرات" value={nutrition.carbs_g} />
            <MacroPill label="الدهون" value={nutrition.fats_g} />
          </div>
        </div>

        {nutrition.notes ? (
          <div className="bg-accent-500/[0.04] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-500">
              ملاحظات المدرب
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
              {nutrition.notes}
            </p>
          </div>
        ) : null}
      </section>

      <div className="flex items-center gap-2">
        <ChefHat className="h-4 w-4 text-accent-500" />
        <h2 className="text-sm font-semibold text-white">
          وجباتك <span className="text-zinc-500">({nutrition.meals?.length ?? 0})</span>
        </h2>
      </div>

      {nutrition.meals && nutrition.meals.length > 0 ? (
        <div className="space-y-4">
          {nutrition.meals.map((meal) => (
            <section key={meal.id} className="card overflow-hidden">
              <div className="flex items-start gap-4 border-b border-ink-800/70 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 font-display text-lg text-accent-400 ring-1 ring-inset ring-accent-600/30">
                  {meal.meal_number}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-white">{meal.title}</h3>
                  {meal.description ? (
                    <p className="mt-0.5 text-xs text-zinc-500">{meal.description}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[11px] uppercase tracking-[0.1em] text-zinc-600">
                  الوجبة {meal.meal_number}
                </span>
              </div>

              {meal.image_path && /^https?:\/\//.test(meal.image_path) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={meal.image_path}
                  alt={meal.title}
                  className="h-48 w-full object-cover"
                />
              ) : null}

              <ul className="divide-y divide-ink-800/60">
                {meal.items.length === 0 ? (
                  <li className="px-5 py-4 text-sm text-zinc-500">لا توجد أطعمة مضافة لهذه الوجبة.</li>
                ) : (
                  meal.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-4 px-5 py-3"
                    >
                      <span className="text-sm text-zinc-200">{item.food_name}</span>
                      <span className="shrink-0 rounded-lg bg-ink-800 px-2.5 py-1 text-xs font-medium text-zinc-400">
                        {item.quantity || "—"}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ChefHat className="h-6 w-6" />}
          title="يجري تجهيز الوجبات"
          description="يعمل مدربك على استكمال تفاصيل وجبات هذه الخطة."
        />
      )}

      <p className="pt-2 text-center text-[11px] leading-relaxed text-zinc-600">
        هذه الخطة مخصصة لك. الأوزان المذكورة للأطعمة قبل الطهي، ويُنصح بشرب 3–4 لترات من الماء يوميًا.
      </p>
    </div>
  );
}
