import Link from "next/link";
import {
  Apple,
  ArrowRight,
  Dumbbell,
  FileText,
  Flame,
  Megaphone,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { requireClient } from "@/lib/auth";
import {
  getClientActivePlans,
  listActiveAnnouncements,
  listClientFiles,
  listNotifications,
  unreadNotificationCount,
} from "@/lib/data";
import {
  CategoryBadge,
  EmptyState,
  MacroPill,
  SectionCard,
  StatusBadge,
  formatDate,
  timeAgo,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClientDashboardPage() {
  const { user, profile } = await requireClient();
  const plans = getClientActivePlans(profile.id);
  const files = listClientFiles(profile.id).slice(0, 4);
  const announcements = listActiveAnnouncements(4);
  const notifications = listNotifications(user.id, 5);
  const unread = unreadNotificationCount(user.id);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صباح الخير" : "مساء الخير";

  return (
    <div className="animate-fade-up space-y-5">
      <section className="card relative overflow-hidden p-6 sm:p-7">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">لوحة العميل</span>
            <StatusBadge status={profile.status} />
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {greeting}, {profile.full_name.split(" ")[0]}.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            {profile.goal
              ? `الهدف الحالي: ${profile.goal}.`
              : "سيضيف مدربك هدفك هنا. كل ما تحتاجه على بُعد ضغطة واحدة."}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/dashboard/nutrition" className="btn-primary btn-sm">
              <Apple className="h-3.5 w-3.5" /> خطتي الغذائية
            </Link>
            <Link href="/dashboard/workouts" className="btn-ghost btn-sm">
              <Dumbbell className="h-3.5 w-3.5" /> تماريني
            </Link>
            <Link href="/dashboard/files" className="btn-ghost btn-sm">
              <FileText className="h-3.5 w-3.5" /> ملفاتي
            </Link>
            <Link href="/dashboard/chat" className="btn-ghost btn-sm">
              <MessageSquare className="h-3.5 w-3.5" /> الشات مع المسؤول
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <Flame className="h-3 w-3" /> الهدف اليومي
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {plans.nutrition?.calories ?? "—"}
            <span className="mr-1 text-xs font-medium text-zinc-500">سعرة</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <TrendingUp className="h-3 w-3" /> البروتين
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {plans.nutrition?.protein_g ?? "—"}
            <span className="mr-1 text-xs font-medium text-zinc-500">جم</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <Dumbbell className="h-3 w-3" /> أيام التمرين
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {plans.workout?.days?.length ?? 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <Sparkles className="h-3 w-3" /> إشعارات جديدة
          </p>
          <p className="mt-2 text-xl font-semibold text-accent-500">{unread}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="خطة التغذية الحالية"
          description={plans.nutrition ? "نظام وجباتك وأهدافك الحالية." : undefined}
          action={
            <Link href="/dashboard/nutrition" className="btn-ghost btn-sm">
              فتح <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {plans.nutrition ? (
            <div>
              <p className="text-lg font-semibold text-white">{plans.nutrition.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {plans.nutrition.meals?.length ?? 0} وجبات · آخر تحديث{" "}
                {formatDate(plans.nutrition.updated_at)}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MacroPill label="البروتين" value={plans.nutrition.protein_g} />
                <MacroPill label="الكربوهيدرات" value={plans.nutrition.carbs_g} />
                <MacroPill label="الدهون" value={plans.nutrition.fats_g} />
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Apple className="h-5 w-5" />}
              title="لا توجد خطة تغذية حتى الآن"
              description="سيعيّن لك FA COACHING خطتك، وسنرسل إليك إشعارًا فور جاهزيتها."
            />
          )}
        </SectionCard>

        <SectionCard
          title="برنامج التمارين الحالي"
          description={plans.workout ? "تقسيم التمارين وأيام التدريب الحالية." : undefined}
          action={
            <Link href="/dashboard/workouts" className="btn-ghost btn-sm">
              فتح <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {plans.workout ? (
            <div>
              <p className="text-lg font-semibold text-white">{plans.workout.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {plans.workout.split_type ?? "تقسيم مخصص"} · {plans.workout.days?.length ?? 0} أيام
              </p>
              <ul className="mt-4 space-y-1.5">
                {(plans.workout.days ?? []).slice(0, 3).map((day) => (
                  <li
                    key={day.id}
                    className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2"
                  >
                    <span className="truncate text-sm text-zinc-200">
                      اليوم {day.day_number} · {day.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-zinc-500">
                      {day.exercises.length} تمارين
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              icon={<Dumbbell className="h-5 w-5" />}
              title="لم يتم تعيين برنامج تمارين بعد"
              description="سيظهر برنامجك هنا فور تعيينه."
            />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard
          title="ملفاتك"
          description="أحدث المستندات والوسائط التي أرسلها مدربك."
          action={
            <Link href="/dashboard/files" className="btn-ghost btn-sm">
              كل الملفات <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {files.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="لا توجد ملفات حتى الآن"
              description="ستظهر هنا صور تقدمك وفيديوهات التمارين والأدلة."
            />
          ) : (
            <ul className="space-y-2">
              {files.map((file) => (
                <li key={file.id}>
                  <a
                    href={`/api/files/${file.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-900/40 px-3.5 py-3 transition hover:border-accent-600/30 hover:bg-ink-800/60"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-accent-500">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-zinc-100">{file.title}</span>
                      <span className="block truncate text-[11px] text-zinc-500">
                        {formatDate(file.created_at)}
                      </span>
                    </span>
                    <CategoryBadge category={file.category} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="الإشعارات"
          description={unread > 0 ? `${unread} غير مقروءة` : "اطلعت على كل جديد."}
        >
          {notifications.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-5 w-5" />}
              title="لا يوجد جديد"
              description="ستصلك هنا إشعارات الخطط والملفات والإعلانات الجديدة."
            />
          ) : (
            <ul className="space-y-3">
              {notifications.map((item) => (
                <li key={item.id} className="flex gap-2.5">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      item.is_read ? "bg-ink-600" : "bg-accent-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200">{item.title}</p>
                    {item.body ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{item.body}</p>
                    ) : null}
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                      {timeAgo(item.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div id="announcements" className="scroll-mt-24">
        <SectionCard
          title="إعلانات المدرب"
          description="ملاحظات وتحديثات المواعيد من FA COACHING."
          action={<Megaphone className="h-4 w-4 text-zinc-600" />}
        >
          {announcements.length === 0 ? (
            <p className="text-sm text-zinc-500">لا توجد إعلانات حاليًا.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="rounded-xl border border-ink-800 bg-ink-900/40 p-4"
                >
                  <p className="text-sm font-semibold text-white">{announcement.title}</p>
                  <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-zinc-400">
                    {announcement.body}
                  </p>
                  <p className="mt-2.5 text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                    {formatDate(announcement.created_at)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
