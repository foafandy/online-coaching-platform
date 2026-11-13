"use client";

import { useActionState, useState } from "react";
import { Upload, X } from "lucide-react";
import {
  createAnnouncementAction,
  replaceFileAction,
  updateClientAction,
  updateFileAction,
  updateNutritionPlanAction,
  updateWorkoutPlanAction,
  uploadFilesAction,
  type ActionState,
} from "@/app/actions/admin";
import { Alert, Field, formatBytes } from "./ui";
import { SubmitButton } from "./submit-button";
import { FILE_CATEGORY_LABELS, type ClientStatus, type FileCategory } from "@/lib/types";

const initial: ActionState = {};
const STATUS_OPTIONS: Array<{ value: ClientStatus; label: string }> = [
  { value: "pending", label: "قيد المراجعة — بانتظار التفعيل" },
  { value: "active", label: "نشط — وصول كامل" },
  { value: "inactive", label: "غير نشط — دون صلاحية وصول" },
  { value: "suspended", label: "موقوف — معلّق مؤقتًا" },
];

function Note({ state }: { state: ActionState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

export function EditClientForm({
  client,
}: {
  client: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    country: string | null;
    goal: string | null;
    coach_notes: string | null;
    status: ClientStatus;
  };
}) {
  const [state, formAction] = useActionState(updateClientAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <Note state={state} />
      <input type="hidden" name="client_id" value={client.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم الكامل" htmlFor="full_name">
          <input id="full_name" name="full_name" defaultValue={client.full_name} required className="input" />
        </Field>
        <Field label="البريد الإلكتروني" htmlFor="email">
          <input id="email" name="email" type="email" defaultValue={client.email} required className="input" />
        </Field>
        <Field label="رقم الهاتف" htmlFor="phone">
          <input id="phone" name="phone" type="tel" defaultValue={client.phone ?? ""} className="input" />
        </Field>
        <Field label="الدولة" htmlFor="country">
          <input id="country" name="country" defaultValue={client.country ?? ""} className="input" />
        </Field>
        <Field label="حالة الحساب" htmlFor="status">
          <select id="status" name="status" defaultValue={client.status} className="input">
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="الهدف" htmlFor="goal">
        <input id="goal" name="goal" defaultValue={client.goal ?? ""} className="input" />
      </Field>
      <Field label="ملاحظات المدرب" htmlFor="coach_notes" hint="ظاهرة لك فقط.">
        <textarea
          id="coach_notes"
          name="coach_notes"
          rows={4}
          defaultValue={client.coach_notes ?? ""}
          className="input resize-y"
        />
      </Field>
      <SubmitButton className="btn-primary">حفظ بيانات العميل</SubmitButton>
    </form>
  );
}

export function UploadFilesForm({
  clients,
}: {
  clients: Array<{ id: string; full_name: string; email: string }>;
}) {
  const [state, formAction] = useActionState(uploadFilesAction, initial);
  const [selected, setSelected] = useState<File[]>([]);

  return (
    <form action={formAction} className="space-y-4">
      <Note state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم المعروض" htmlFor="title" hint="اختياري عند رفع عدة ملفات — يحتفظ كل ملف باسمه.">
          <input id="title" name="title" className="input" placeholder="مثال: تحديث خطة التغذية للأسبوع الرابع" />
        </Field>
        <Field label="التصنيف" htmlFor="category">
          <select id="category" name="category" className="input" defaultValue="nutrition">
            {Object.entries(FILE_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="الوصف" htmlFor="description">
        <textarea
          id="description"
          name="description"
          rows={2}
          className="input resize-y"
          placeholder="ملاحظة قصيرة تظهر للعميل"
        />
      </Field>

      <div>
        <label className="field-label">الملفات</label>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ink-600 bg-ink-900/50 px-4 py-8 text-center transition hover:border-accent-600/50">
          <Upload className="h-5 w-5 text-zinc-500" />
          <span className="mt-2 text-sm font-medium text-zinc-300">اختر الملفات</span>
          <span className="mt-1 text-xs text-zinc-500">
            PDF وJPG وPNG وWEBP وMP4 وDOC/XLS/PPT وTXT — بحد أقصى 50 ميجابايت لكل ملف
          </span>
          <input
            type="file"
            name="files"
            multiple
            required
            className="hidden"
            onChange={(event) => setSelected(Array.from(event.target.files ?? []))}
          />
        </label>
        {selected.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {selected.map((file) => (
              <li
                key={`${file.name}-${file.size}`}
                className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-900/60 px-3 py-2 text-xs"
              >
                <span className="truncate text-zinc-300">{file.name}</span>
                <span className="ml-3 shrink-0 text-zinc-500">{formatBytes(file.size)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <p className="field-label">تعيين للعملاء</p>
        <div className="max-h-52 overflow-y-auto rounded-xl border border-ink-700 bg-ink-900/50 p-2">
          {clients.length === 0 ? (
            <p className="px-2 py-3 text-sm text-zinc-500">لم يُسجّل أي عملاء حتى الآن.</p>
          ) : (
            clients.map((client) => (
              <label
                key={client.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-zinc-300 hover:bg-ink-800"
              >
                <input
                  type="checkbox"
                  name="client_ids"
                  value={client.id}
                  className="h-4 w-4 rounded border-ink-600 bg-ink-950 accent-accent-500"
                />
                <span className="truncate">{client.full_name}</span>
                <span className="truncate text-xs text-zinc-500">{client.email}</span>
              </label>
            ))
          )}
        </div>
        <p className="mt-1.5 text-xs text-zinc-500">
          اترك الخيارات دون تحديد لرفع الملفات من دون تعيينها — يمكنك تعيينها لاحقًا.
        </p>
      </div>

      <SubmitButton className="btn-primary" pendingLabel="جارٍ الرفع…">
        رفع الملفات
      </SubmitButton>
    </form>
  );
}

export function UpdateFileForm({
  file,
  clients,
  assigned,
}: {
  file: { id: string; title: string; description: string | null; category: FileCategory };
  clients: Array<{ id: string; full_name: string; email: string }>;
  assigned: string[];
}) {
  const [state, formAction] = useActionState(updateFileAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <Note state={state} />
      <input type="hidden" name="file_id" value={file.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم الملف" htmlFor={`title-${file.id}`}>
          <input id={`title-${file.id}`} name="title" defaultValue={file.title} required className="input" />
        </Field>
        <Field label="التصنيف" htmlFor={`category-${file.id}`}>
          <select
            id={`category-${file.id}`}
            name="category"
            defaultValue={file.category}
            className="input"
          >
            {Object.entries(FILE_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="الوصف" htmlFor={`description-${file.id}`}>
        <textarea
          id={`description-${file.id}`}
          name="description"
          rows={2}
          defaultValue={file.description ?? ""}
          className="input resize-y"
        />
      </Field>
      <div>
        <p className="field-label">العملاء المعيّن لهم</p>
        <div className="max-h-44 overflow-y-auto rounded-xl border border-ink-700 bg-ink-900/50 p-2">
          {clients.map((client) => (
            <label
              key={client.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-ink-800"
            >
              <input
                type="checkbox"
                name="client_ids"
                value={client.id}
                defaultChecked={assigned.includes(client.id)}
                className="h-4 w-4 rounded border-ink-600 bg-ink-950 accent-accent-500"
              />
              {client.full_name}
            </label>
          ))}
        </div>
      </div>
      <SubmitButton className="btn-primary btn-sm">حفظ الملف</SubmitButton>
    </form>
  );
}

export function ReplaceFileForm({ fileId }: { fileId: string }) {
  const [state, formAction] = useActionState(replaceFileAction, initial);
  return (
    <form action={formAction} className="space-y-3">
      <Note state={state} />
      <input type="hidden" name="file_id" value={fileId} />
      <input
        type="file"
        name="file"
        required
        className="w-full rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2 text-xs text-zinc-400 file:ml-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-200"
      />
      <SubmitButton className="btn-ghost btn-sm" pendingLabel="جارٍ الاستبدال…">
        استبدال الملف
      </SubmitButton>
    </form>
  );
}

export function NutritionDetailsForm({
  plan,
}: {
  plan: {
    id: string;
    title: string;
    description: string | null;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fats_g: number | null;
    notes: string | null;
  };
}) {
  const [state, formAction] = useActionState(updateNutritionPlanAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <Note state={state} />
      <input type="hidden" name="plan_id" value={plan.id} />
      <Field label="عنوان الخطة" htmlFor="title">
        <input id="title" name="title" defaultValue={plan.title} required className="input" />
      </Field>
      <Field label="الوصف" htmlFor="description">
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={plan.description ?? ""}
          className="input resize-y"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["calories", "السعرات", plan.calories, "سعرة"],
          ["protein_g", "البروتين", plan.protein_g, "جم"],
          ["carbs_g", "الكربوهيدرات", plan.carbs_g, "جم"],
          ["fats_g", "الدهون", plan.fats_g, "جم"],
        ].map(([name, label, value, unit]) => (
          <Field key={String(name)} label={`${label} (${unit})`} htmlFor={String(name)}>
            <input
              id={String(name)}
              name={String(name)}
              type="number"
              min={0}
              step={name === "calories" ? 10 : 1}
              defaultValue={value == null ? "" : String(value)}
              className="input"
              placeholder="0"
            />
          </Field>
        ))}
      </div>
      <Field label="ملاحظات المدرب" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={plan.notes ?? ""}
          className="input resize-y"
        />
      </Field>
      <SubmitButton className="btn-primary">حفظ الخطة</SubmitButton>
    </form>
  );
}

export function WorkoutDetailsForm({
  plan,
}: {
  plan: {
    id: string;
    title: string;
    description: string | null;
    split_type: string | null;
    notes: string | null;
  };
}) {
  const [state, formAction] = useActionState(updateWorkoutPlanAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <Note state={state} />
      <input type="hidden" name="plan_id" value={plan.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="عنوان البرنامج" htmlFor="title">
          <input id="title" name="title" defaultValue={plan.title} required className="input" />
        </Field>
        <Field label="نوع التقسيم" htmlFor="split_type">
          <input
            id="split_type"
            name="split_type"
            defaultValue={plan.split_type ?? ""}
            className="input"
            placeholder="دفع / سحب / أرجل"
          />
        </Field>
      </div>
      <Field label="الوصف" htmlFor="description">
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={plan.description ?? ""}
          className="input resize-y"
        />
      </Field>
      <Field label="ملاحظات البرنامج" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={plan.notes ?? ""}
          className="input resize-y"
        />
      </Field>
      <SubmitButton className="btn-primary">حفظ البرنامج</SubmitButton>
    </form>
  );
}

export function AnnouncementForm() {
  const [state, formAction] = useActionState(createAnnouncementAction, initial);
  const [publish, setPublish] = useState(true);
  return (
    <form action={formAction} className="space-y-4">
      <Note state={state} />
      <Field label="العنوان" htmlFor="title">
        <input id="title" name="title" required className="input" placeholder="تذكير بمتابعة التقدم الأسبوعية" />
      </Field>
      <Field label="الرسالة" htmlFor="body">
        <textarea
          id="body"
          name="body"
          rows={5}
          required
          className="input resize-y"
          placeholder="أرسل الوزن ومحيط الخصر وصور التقدم قبل يوم الجمعة الساعة 10 صباحًا."
        />
      </Field>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
        <input
          type="checkbox"
          name="publish"
          checked={publish}
          onChange={(event) => setPublish(event.target.checked)}
          className="h-4 w-4 rounded border-ink-600 bg-ink-950 accent-accent-500"
        />
        النشر الآن وإشعار جميع العملاء النشطين
      </label>
      <SubmitButton className="btn-primary">
        {publish ? "نشر الإعلان" : "حفظ المسودة"}
      </SubmitButton>
    </form>
  );
}

export function Chip({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-800 px-2.5 py-1 text-xs text-zinc-300">
      {children}
      {onRemove ? (
        <button type="button" onClick={onRemove} className="text-zinc-500 hover:text-red-300">
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}
