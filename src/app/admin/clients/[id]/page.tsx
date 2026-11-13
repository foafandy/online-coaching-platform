import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Apple,
  ArrowLeft,
  Download,
  Dumbbell,
  ExternalLink,
  FileText,
  MessageSquare,
  Upload,
} from "lucide-react";
import { requireAssignedClient } from "@/lib/auth";
import {
  getAssignmentHistory,
  getClientActivePlans,
  getClientById,
  getClientOnboarding,
  listFilesWithAssignments,
  listNutritionPlans,
  listWorkoutPlans,
} from "@/lib/data";
import {
  assignNutritionAction,
  assignWorkoutAction,
  deleteClientAction,
  setClientFilesAction,
  setClientStatus,
  uploadClientAvatar,
} from "@/app/actions/admin";
import {
  CategoryBadge,
  EmptyState,
  Field,
  PageHeader,
  SectionCard,
  StatusBadge,
  formatBytes,
  formatDate,
} from "@/components/ui";
import { EditClientForm } from "@/components/admin-forms";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

const EXPERIENCE_LABELS = {
  beginner: "مبتدئ",
  some: "خبرة متقطعة",
  experienced: "يتمرن بانتظام",
} as const;

const TRAINING_LOCATION_LABELS = {
  gym: "جيم",
  home: "المنزل",
  other: "مكان آخر",
} as const;

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAssignedClient(id);
  const client = getClientById(id);
  if (!client) notFound();

  const plans = getClientActivePlans(client.id);
  const nutritionTemplates = listNutritionPlans(true);
  const workoutTemplates = listWorkoutPlans(true);
  const files = listFilesWithAssignments(
    client.id,
    session.user.admin_scope === "clients",
  );
  const history = getAssignmentHistory(client.id);
  const onboarding = getClientOnboarding(client.id);
  const assignedFiles = files.filter((file) => file.assigned === 1);
  const avatarUrl = client.avatar_path
    ? `/api/avatar/${client.user_id}?v=${encodeURIComponent(client.updated_at)}`
    : null;

  return (
    <div className="animate-fade-up">
      <Link
        href="/admin/clients"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> العودة إلى العملاء
      </Link>

      <PageHeader
        eyebrow="ملف العميل"
        title={client.full_name}
        description={`${client.email} · تاريخ التسجيل ${formatDate(client.created_at)}${
          client.subscription_started_at
            ? ` · بداية الاشتراك ${formatDate(client.subscription_started_at)}`
            : ""
        }`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/admin/clients/${client.id}/chat`} className="btn-primary btn-sm">
              <MessageSquare className="h-3.5 w-3.5" /> محادثة المتدرب
            </Link>
            <StatusBadge status={client.status} />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <SectionCard title="بيانات الحساب" description="معلومات التواصل وملاحظات التدريب.">
            <EditClientForm client={client} />
          </SectionCard>

          <SectionCard
            title="بيانات بداية التمرين"
            description={
              onboarding
                ? `أرسلها المتدرب في ${formatDate(onboarding.submitted_at, true)} ووافق على حفظ البيانات والصور.`
                : "لم يستكمل المتدرب بياناته وصور التقدم بعد."
            }
          >
            {onboarding ? (
              <div className="space-y-5">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-zinc-500">الوزن</dt>
                    <dd className="mt-1 text-sm text-zinc-200">{onboarding.weight_kg} كجم</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">الطول</dt>
                    <dd className="mt-1 text-sm text-zinc-200">{onboarding.height_cm} سم</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">العمر</dt>
                    <dd className="mt-1 text-sm text-zinc-200">{onboarding.age} سنة</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">الخبرة</dt>
                    <dd className="mt-1 text-sm text-zinc-200">
                      {EXPERIENCE_LABELS[onboarding.experience]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">الهدف</dt>
                    <dd className="mt-1 whitespace-pre-line text-sm text-zinc-200">
                      {onboarding.goal}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">أيام التمرين أسبوعيًا</dt>
                    <dd className="mt-1 text-sm text-zinc-200">{onboarding.training_days}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">مكان التمرين</dt>
                    <dd className="mt-1 text-sm text-zinc-200">
                      {TRAINING_LOCATION_LABELS[onboarding.training_location]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">إصابة أو حالة صحية أو دواء مؤثر</dt>
                    <dd className="mt-1 text-sm text-zinc-200">
                      {onboarding.health_flag === "yes" ? "نعم" : "لا"}
                    </dd>
                  </div>
                  {onboarding.health_notes ? (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-zinc-500">التفاصيل الصحية</dt>
                      <dd className="mt-1 whitespace-pre-line text-sm text-zinc-200">
                        {onboarding.health_notes}
                      </dd>
                    </div>
                  ) : null}
                  {onboarding.dietary_notes ? (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-zinc-500">ملاحظات غذائية أو إضافية</dt>
                      <dd className="mt-1 whitespace-pre-line text-sm text-zinc-200">
                        {onboarding.dietary_notes}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {([
                    ["front", "من الأمام"],
                    ["side", "من الجانب"],
                    ["back", "من الخلف"],
                  ] as const).map(([type, label]) => {
                    const src = `/api/admin/onboarding-photos/${client.id}/${type}`;
                    return (
                      <a
                        key={type}
                        href={src}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                      >
                        <Image
                          src={src}
                          alt={`صورة المتدرب ${label}`}
                          width={400}
                          height={400}
                          unoptimized
                          className="aspect-square w-full rounded-lg border border-ink-700 object-cover"
                        />
                        <span className="mt-1 block text-center text-xs text-zinc-400">{label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="الملفات المعيّنة"
            description="الملفات المحددة فقط هي التي تظهر في لوحة العميل."
            action={
              <Link href="/admin/files" className="btn-ghost btn-sm">
                <Upload className="h-3.5 w-3.5" /> رفع
              </Link>
            }
          >
            {files.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title="لم يتم رفع ملفات بعد"
                description="ارفع ملف PDF أو صورة أو فيديو وعيّنه لهذا العميل."
                action={
                  <Link href="/admin/files" className="btn-primary btn-sm">
                    الانتقال إلى الملفات
                  </Link>
                }
              />
            ) : (
              <form action={setClientFilesAction} className="space-y-4">
                <input type="hidden" name="client_id" value={client.id} />
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-ink-700 bg-ink-900/40 p-2">
                  {files.map((file) => (
                    <label
                      key={file.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-ink-800"
                    >
                      <input
                        type="checkbox"
                        name="file_ids"
                        value={file.id}
                        defaultChecked={file.assigned === 1}
                        className="h-4 w-4 rounded border-ink-600 bg-ink-950 accent-accent-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-zinc-200">{file.title}</span>
                        <span className="block text-[11px] text-zinc-500">
                          {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
                        </span>
                      </span>
                      <CategoryBadge category={file.category} />
                    </label>
                  ))}
                </div>
                <SubmitButton className="btn-primary btn-sm">حفظ صلاحية الوصول للملفات</SubmitButton>
              </form>
            )}

            {assignedFiles.length > 0 ? (
              <div className="mt-5 border-t border-ink-800 pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  ظاهرة لهذا العميل ({assignedFiles.length})
                </p>
                <ul className="space-y-1.5">
                  {assignedFiles.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-ink-800 bg-ink-900/40 px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-zinc-200">{file.title}</span>
                        <span className="block text-[11px] text-zinc-500">
                          {file.original_name} · {formatBytes(file.size_bytes)}
                        </span>
                      </span>
                      <a
                        href={`/api/files/${file.id}?download=1`}
                        className="shrink-0 rounded-lg border border-ink-700 p-1.5 text-zinc-400 transition hover:text-accent-400"
                        title="تنزيل"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="سجل التعيينات" description="كل الخطط التي حصل عليها هذا العميل.">
            {history.length === 0 ? (
              <p className="text-sm text-zinc-500">لم يتم تعيين خطط بعد.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-800 bg-ink-900/40 px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      {item.kind === "nutrition" ? (
                        <Apple className="h-4 w-4 text-accent-500" />
                      ) : (
                        <Dumbbell className="h-4 w-4 text-accent-500" />
                      )}
                      <div>
                        <p className="text-sm text-zinc-200">{item.plan_title ?? "خطة محذوفة"}</p>
                        <p className="text-[11px] text-zinc-500">
                          {formatDate(item.assigned_at, true)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`badge ${
                        item.is_active
                          ? "border-accent-600/30 bg-accent-500/10 text-accent-400"
                          : "border-ink-600 bg-ink-800 text-zinc-500"
                      }`}
                    >
                      {item.is_active ? "حالية" : "مؤرشفة"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="الصورة الشخصية">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={client.full_name}
                  className="h-16 w-16 rounded-2xl object-cover ring-1 ring-ink-600"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-800 text-lg font-bold text-zinc-400">
                  {client.full_name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <form action={uploadClientAvatar} className="flex-1 space-y-2">
                <input type="hidden" name="client_id" value={client.id} />
                <input
                  type="file"
                  name="avatar"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  className="w-full text-xs text-zinc-400 file:ml-2 file:rounded-lg file:border-0 file:bg-ink-700 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-200"
                />
                <SubmitButton className="btn-ghost btn-sm" pendingLabel="جارٍ الرفع…">
                  تحديث الصورة
                </SubmitButton>
              </form>
            </div>
            <dl className="mt-4 space-y-2 border-t border-ink-800 pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">رقم الهاتف</dt>
                <dd className="text-right text-zinc-200">{client.phone ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">الهدف</dt>
                <dd className="max-w-[60%] text-right text-zinc-200">{client.goal ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">تاريخ التسجيل</dt>
                <dd className="text-right text-zinc-200">{formatDate(client.created_at)}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="صلاحية الحساب">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["active", "تفعيل"],
                  ["pending", "إبقاء قيد المراجعة"],
                  ["inactive", "إلغاء التفعيل"],
                  ["suspended", "إيقاف"],
                ] as const
              ).map(([status, label]) => (
                <form key={status} action={setClientStatus}>
                  <input type="hidden" name="client_id" value={client.id} />
                  <input type="hidden" name="status" value={status} />
                  <button
                    type="submit"
                    disabled={client.status === status}
                    className={`w-full ${
                      status === "active" ? "btn-primary btn-sm" : "btn-ghost btn-sm"
                    } disabled:opacity-40`}
                  >
                    {label}
                  </button>
                </form>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              لا يمكن للعملاء <span className="text-accent-400">النشطين</span> فقط فتح لوحة التحكم.
            </p>
          </SectionCard>

          <SectionCard title="خطة التغذية الحالية">
            {plans.nutrition ? (
              <div>
                <p className="text-sm font-medium text-white">{plans.nutrition.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {plans.nutrition.meals?.length ?? 0} وجبات ·{" "}
                  {plans.nutrition.calories ? `${plans.nutrition.calories} سعرة` : "لا توجد أهداف"}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/admin/nutrition/${plans.nutrition.id}`} className="btn-ghost btn-sm">
                    فتح الخطة <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">لم يتم تعيين خطة تغذية.</p>
            )}

            <form action={assignNutritionAction} className="mt-4 space-y-2 border-t border-ink-800 pt-4">
              <input type="hidden" name="client_id" value={client.id} />
              <Field label="التعيين من قالب" htmlFor="nutrition-plan">
                <select
                  id="nutrition-plan"
                  name="plan_id"
                  className="input"
                  required
                  defaultValue=""
                  disabled={nutritionTemplates.length === 0}
                >
                  <option value="" disabled>
                    {nutritionTemplates.length ? "اختر قالب تغذية…" : "لا توجد قوالب حتى الآن"}
                  </option>
                  {nutritionTemplates.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title}
                    </option>
                  ))}
                </select>
              </Field>
              <SubmitButton className="btn-primary btn-sm w-full" pendingLabel="جارٍ التعيين…">
                تعيين خطة التغذية
              </SubmitButton>
              <p className="text-[11px] leading-relaxed text-zinc-500">
                تُنشأ نسخة خاصة، لذلك لن تؤثر تعديلات القالب لاحقًا على خطة هذا العميل.
              </p>
            </form>
          </SectionCard>

          <SectionCard title="برنامج التمارين الحالي">
            {plans.workout ? (
              <div>
                <p className="text-sm font-medium text-white">{plans.workout.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {plans.workout.split_type ?? "تقسيم مخصص"} · {plans.workout.days?.length ?? 0} أيام
                </p>
                <div className="mt-3">
                  <Link href={`/admin/workouts/${plans.workout.id}`} className="btn-ghost btn-sm">
                    فتح البرنامج <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">لم يتم تعيين برنامج تمارين.</p>
            )}

            <form action={assignWorkoutAction} className="mt-4 space-y-2 border-t border-ink-800 pt-4">
              <input type="hidden" name="client_id" value={client.id} />
              <Field label="التعيين من قالب" htmlFor="workout-plan">
                <select
                  id="workout-plan"
                  name="plan_id"
                  className="input"
                  required
                  defaultValue=""
                  disabled={workoutTemplates.length === 0}
                >
                  <option value="" disabled>
                    {workoutTemplates.length ? "اختر قالب تمارين…" : "لا توجد قوالب حتى الآن"}
                  </option>
                  {workoutTemplates.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title}
                    </option>
                  ))}
                </select>
              </Field>
              <SubmitButton className="btn-primary btn-sm w-full" pendingLabel="جارٍ التعيين…">
                تعيين برنامج التمارين
              </SubmitButton>
            </form>
          </SectionCard>

          <SectionCard title="ملاحظات المدرب">
            <div className="flex gap-2.5 rounded-xl border border-ink-800 bg-ink-900/50 p-3">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                {client.coach_notes || "لا توجد ملاحظات بعد. أضفها من نموذج بيانات الحساب."}
              </p>
            </div>
          </SectionCard>

          {session.user.admin_scope === "full" ? (
            <SectionCard title="منطقة الخطر" className="border-red-500/20">
              <form action={deleteClientAction}>
                <input type="hidden" name="client_id" value={client.id} />
                <SubmitButton
                  className="btn-danger btn-sm w-full"
                  confirm={`هل تريد حذف حساب ${client.full_name}؟ سيؤدي ذلك إلى حذف ملفه الشخصي وخططه وصلاحية الوصول إلى ملفاته.`}
                  pendingLabel="جارٍ الحذف…"
                >
                  حذف حساب العميل
                </SubmitButton>
              </form>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
