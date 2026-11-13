import Link from "next/link";
import { ArrowLeft, ChevronDown, Dumbbell, ExternalLink, Timer } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { getClientActivePlans } from "@/lib/data";
import { EmptyState, PageHeader, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClientWorkoutsPage() {
  const { profile } = await requireClient();
  const { workout } = getClientActivePlans(profile.id);

  if (!workout) {
    return (
      <div className="animate-fade-up">
        <PageHeader eyebrow="التمارين" title="تماريني" />
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" />}
          title="لا يوجد برنامج تمارين حتى الآن"
          description="سيظهر تقسيمك وأيامك وتمارينك هنا فور تعيين البرنامج من FA COACHING."
        />
      </div>
    );
  }

  const days = workout.days ?? [];
  const totalExercises = days.reduce((sum, day) => sum + day.exercises.length, 0);

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
          eyebrow="برنامج التمارين"
          title={workout.title}
          description={workout.description ?? undefined}
        />
      </div>

      <section className="card relative overflow-hidden p-6">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              التقسيم
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{workout.split_type ?? "مخصص"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              أيام التمرين
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{days.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              التمارين
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{totalExercises}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              آخر تحديث
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{formatDate(workout.updated_at)}</p>
          </div>
        </div>

        {workout.notes ? (
          <div className="relative mt-5 rounded-xl border border-accent-600/20 bg-accent-500/[0.05] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-500">
              ملاحظات البرنامج
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
              {workout.notes}
            </p>
          </div>
        ) : null}
      </section>

      {days.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" />}
          title="يجري إعداد أيام التمرين"
          description="يعمل مدربك على إعداد جلسات هذا البرنامج."
        />
      ) : (
        <div className="space-y-3">
          {days.map((day, index) => (
            <details
              key={day.id}
              open={index === 0}
              className="card group overflow-hidden [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 font-display text-lg text-accent-400 ring-1 ring-inset ring-accent-600/30">
                  {day.day_number}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-white sm:text-base">
                    {day.title}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {day.focus ?? "يوم تمرين"} · {day.exercises.length} تمارين
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition group-open:rotate-180" />
              </summary>

              <div className="border-t border-ink-800 px-5 pb-5 pt-4">
                {day.notes ? (
                  <p className="mb-3 rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2 text-xs leading-relaxed text-zinc-400">
                    {day.notes}
                  </p>
                ) : null}

                <ul className="space-y-2.5">
                  {day.exercises.map((exercise) => (
                    <li
                      key={exercise.id}
                      className="rounded-xl border border-ink-800 bg-ink-900/40 p-3.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-zinc-100">{exercise.name}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-ink-800 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                            {exercise.sets ?? "—"} × {exercise.reps ?? "—"}
                          </span>
                          {exercise.rest_seconds ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-ink-800 px-2 py-0.5 text-[11px] text-zinc-400">
                              <Timer className="h-3 w-3" /> {exercise.rest_seconds} ث
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {exercise.instructions ? (
                        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                          {exercise.instructions}
                        </p>
                      ) : null}

                      {exercise.coach_notes ? (
                        <p className="mt-2 rounded-lg border border-accent-600/20 bg-accent-500/[0.05] px-2.5 py-1.5 text-[11px] leading-relaxed text-accent-300">
                          ملاحظة المدرب: {exercise.coach_notes}
                        </p>
                      ) : null}

                      {exercise.video_stored_name ? (
                        <video
                          controls
                          preload="metadata"
                          className="mt-3 max-h-80 w-full rounded-xl border border-ink-700 bg-black"
                          aria-label={`فيديو تمرين ${exercise.name}`}
                        >
                          <source
                            src={`/api/workout-videos/${exercise.id}`}
                            type={exercise.video_mime_type ?? "video/mp4"}
                          />
                          المتصفح لا يدعم تشغيل الفيديو.
                        </video>
                      ) : null}

                      {exercise.video_url ? (
                        <a
                          href={exercise.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent-400 hover:underline"
                        >
                          مشاهدة الشرح <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
