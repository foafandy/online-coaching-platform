import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, Plus, Trash2, Users } from "lucide-react";
import { requireAssignedPlan } from "@/lib/auth";
import { getWorkoutPlan, listClients } from "@/lib/data";
import {
  addExerciseAction,
  addWorkoutDayAction,
  assignWorkoutAction,
  deleteExerciseAction,
  deleteWorkoutDayAction,
  deleteWorkoutPlanAction,
  updateExerciseAction,
  updateWorkoutDayAction,
} from "@/app/actions/admin";
import { WorkoutDetailsForm } from "@/components/admin-forms";
import { EmptyState, Field, PageHeader, SectionCard } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function WorkoutPlanEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAssignedPlan("workout", id);
  const plan = getWorkoutPlan(id);
  if (!plan) notFound();

  const clients = listClients({
    status: "active",
    managerUserId: session.user.admin_scope === "clients" ? session.user.id : undefined,
  });
  const days = plan.days ?? [];

  return (
    <div className="animate-fade-up">
      <Link
        href={session.user.admin_scope === "full" ? "/admin/workouts" : "/admin/clients"}
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> العودة إلى برامج التمارين
      </Link>

      <PageHeader
        eyebrow={plan.is_template ? "قالب تمارين" : "نسخة برنامج العميل"}
        title={plan.title}
        description={
          plan.is_template
            ? "تُعدّل التغييرات هنا القالب. ويحتفظ كل عميل بنسخته الخاصة."
            : "هذا البرنامج معيّن لعميل واحد. تُطبّق التغييرات فورًا."
        }
        action={session.user.admin_scope === "full" ? (
          <form action={deleteWorkoutPlanAction}>
            <input type="hidden" name="plan_id" value={plan.id} />
            <SubmitButton
              className="btn-danger btn-sm"
              confirm="هل تريد حذف برنامج التمارين هذا؟"
              pendingLabel="جارٍ الحذف…"
            >
              <Trash2 className="h-3.5 w-3.5" /> حذف
            </SubmitButton>
          </form>
        ) : undefined}
      />

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <SectionCard title="إعدادات البرنامج">
            <WorkoutDetailsForm plan={plan} />
          </SectionCard>

          {plan.is_template ? (
            <SectionCard title="تعيين لعميل" description="ينشئ نسخة خاصة من هذا البرنامج.">
              {clients.length === 0 ? (
                <p className="text-sm text-zinc-500">لا يوجد عملاء نشطون حتى الآن.</p>
              ) : (
                <form action={assignWorkoutAction} className="space-y-3">
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
                    <Users className="h-3.5 w-3.5" /> تعيين البرنامج
                  </SubmitButton>
                </form>
              )}
            </SectionCard>
          ) : null}
        </div>

        <div className="space-y-5">
          {days.length === 0 ? (
            <EmptyState
              icon={<CalendarPlus className="h-6 w-6" />}
              title="لا توجد أيام تدريب حتى الآن"
              description="أضف يومك الأول أدناه، ثم أضف التمارين إليه."
            />
          ) : (
            days.map((day) => (
              <section key={day.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-500">
                      اليوم {day.day_number}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-white">{day.title}</h3>
                    {day.focus ? <p className="text-xs text-zinc-500">{day.focus}</p> : null}
                  </div>
                  <form action={deleteWorkoutDayAction}>
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <input type="hidden" name="day_id" value={day.id} />
                    <SubmitButton
                      className="btn-ghost btn-sm text-red-300"
                      confirm="هل تريد حذف يوم التدريب هذا؟"
                      pendingLabel="…"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </SubmitButton>
                  </form>
                </div>

                {day.notes ? (
                  <p className="mt-2 rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2 text-xs text-zinc-400">
                    {day.notes}
                  </p>
                ) : null}

                <ul className="mt-4 divide-y divide-ink-800/80">
                  {day.exercises.length === 0 ? (
                    <li className="py-3 text-xs text-zinc-500">لا توجد تمارين حتى الآن.</li>
                  ) : (
                    day.exercises.map((exercise) => (
                      <li key={exercise.id} className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-100">{exercise.name}</p>
                            <p className="mt-0.5 text-[11px] text-zinc-500">
                              {exercise.sets ?? "—"} مجموعات × {exercise.reps ?? "—"} تكرارات · راحة{" "}
                              {exercise.rest_seconds ? `${exercise.rest_seconds} ث` : "—"}
                              {exercise.video_url ? " · فيديو" : ""}
                            </p>
                          </div>
                          <form action={deleteExerciseAction}>
                            <input type="hidden" name="plan_id" value={plan.id} />
                            <input type="hidden" name="exercise_id" value={exercise.id} />
                            <button
                              type="submit"
                              className="text-zinc-600 transition hover:text-red-400"
                              aria-label="حذف التمرين"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        </div>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[11px] font-medium text-zinc-600 hover:text-zinc-400">
                            تعديل التمرين
                          </summary>
                          <form action={updateExerciseAction} className="mt-2 space-y-2">
                            <input type="hidden" name="plan_id" value={plan.id} />
                            <input type="hidden" name="exercise_id" value={exercise.id} />
                            <div className="grid gap-2 sm:grid-cols-[1fr_70px_70px_80px]">
                              <input name="name" defaultValue={exercise.name} required className="input" />
                              <input name="sets" defaultValue={exercise.sets ?? ""} placeholder="المجموعات" className="input" />
                              <input name="reps" defaultValue={exercise.reps ?? ""} placeholder="التكرارات" className="input" />
                              <input
                                name="rest_seconds"
                                type="number"
                                min={0}
                                defaultValue={exercise.rest_seconds ?? ""}
                                placeholder="الراحة بالثواني"
                                className="input"
                              />
                            </div>
                            <input
                              name="video_url"
                              defaultValue={exercise.video_url ?? ""}
                              placeholder="رابط الفيديو (https://…)"
                              className="input"
                            />
                            <label className="block text-xs text-zinc-400">
                              رفع فيديو من الجهاز (MP4 / WEBM / MOV، حتى 100 ميجابايت)
                              <input
                                type="file"
                                name="video_file"
                                accept="video/mp4,video/webm,video/quicktime"
                                className="input mt-1"
                              />
                            </label>
                            {exercise.video_stored_name ? (
                              <a
                                href={`/api/workout-videos/${exercise.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex text-xs font-medium text-accent-400 hover:underline"
                              >
                                مشاهدة الفيديو المرفوع: {exercise.video_original_name}
                              </a>
                            ) : null}
                            <textarea
                              name="instructions"
                              defaultValue={exercise.instructions ?? ""}
                              placeholder="تعليمات الأداء"
                              rows={2}
                              className="input resize-y"
                            />
                            <textarea
                              name="coach_notes"
                              defaultValue={exercise.coach_notes ?? ""}
                              placeholder="ملاحظة من المدرب للعميل"
                              rows={2}
                              className="input resize-y"
                            />
                            <SubmitButton className="btn-ghost btn-sm">حفظ التمرين</SubmitButton>
                          </form>
                        </details>
                      </li>
                    ))
                  )}
                </ul>

                <form
                  action={addExerciseAction}
                  className="mt-3 grid gap-2 border-t border-ink-800 pt-3 sm:grid-cols-[1fr_60px_60px_70px]"
                >
                  <input type="hidden" name="plan_id" value={plan.id} />
                  <input type="hidden" name="day_id" value={day.id} />
                  <input name="name" required placeholder="اسم التمرين" className="input" />
                  <input name="sets" placeholder="المجموعات" className="input" />
                  <input name="reps" placeholder="التكرارات" className="input" />
                  <input
                    name="video_file"
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    aria-label="فيديو التمرين"
                    className="input text-xs sm:col-span-4"
                  />
                  <input
                    name="video_url"
                    type="url"
                    placeholder="أو رابط فيديو (https://…)"
                    className="input sm:col-span-3"
                  />
                  <SubmitButton className="btn-ghost btn-sm" pendingLabel="…">
                    <Plus className="h-3.5 w-3.5" /> إضافة
                  </SubmitButton>
                </form>

                <details className="mt-3">
                  <summary className="cursor-pointer text-[11px] font-medium text-zinc-600 hover:text-zinc-400">
                    تعديل تفاصيل اليوم
                  </summary>
                  <form action={updateWorkoutDayAction} className="mt-2 space-y-2">
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <input type="hidden" name="day_id" value={day.id} />
                    <div className="grid gap-2 sm:grid-cols-[70px_1fr]">
                      <input
                        name="day_number"
                        type="number"
                        min={1}
                        defaultValue={day.day_number}
                        className="input"
                      />
                      <input name="title" defaultValue={day.title} required className="input" />
                    </div>
                    <input name="focus" defaultValue={day.focus ?? ""} placeholder="التركيز" className="input" />
                    <textarea
                      name="notes"
                      defaultValue={day.notes ?? ""}
                      rows={2}
                      placeholder="ملاحظات اليوم"
                      className="input resize-y"
                    />
                    <SubmitButton className="btn-ghost btn-sm">حفظ اليوم</SubmitButton>
                  </form>
                </details>
              </section>
            ))
          )}

          <SectionCard title="إضافة يوم تدريب">
            <form action={addWorkoutDayAction} className="space-y-3">
              <input type="hidden" name="plan_id" value={plan.id} />
              <div className="grid gap-3 sm:grid-cols-[90px_1fr]">
                <Field label="رقم اليوم" htmlFor="day_number">
                  <input
                    id="day_number"
                    name="day_number"
                    type="number"
                    min={1}
                    defaultValue={days.length + 1}
                    className="input"
                  />
                </Field>
                <Field label="العنوان" htmlFor="day-title">
                  <input
                    id="day-title"
                    name="title"
                    required
                    className="input"
                    placeholder="دفع أ — تركيز الصدر"
                  />
                </Field>
              </div>
              <Field label="التركيز" htmlFor="focus">
                <input id="focus" name="focus" className="input" placeholder="الصدر، الأكتاف، الترايسبس" />
              </Field>
              <Field label="ملاحظات" htmlFor="day-notes">
                <input id="day-notes" name="notes" className="input" placeholder="ملاحظة تدريب اختيارية" />
              </Field>
              <SubmitButton className="btn-primary btn-sm" pendingLabel="جارٍ الإضافة…">
                <CalendarPlus className="h-3.5 w-3.5" /> إضافة يوم
              </SubmitButton>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
