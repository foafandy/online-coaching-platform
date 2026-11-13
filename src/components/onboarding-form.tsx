"use client";

import { useActionState } from "react";
import { submitOnboardingAction, type OnboardingState } from "@/app/actions/onboarding";
import { Alert, Field } from "./ui";
import { SubmitButton } from "./submit-button";

const initialState: OnboardingState = {};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1.5 text-xs font-medium text-red-300">{message}</p> : null;
}

export function OnboardingForm() {
  const [state, formAction] = useActionState(submitOnboardingAction, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">بياناتك الحالية</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="الوزن (كجم)" htmlFor="weight_kg">
            <input id="weight_kg" name="weight_kg" type="number" min="25" max="350" step="0.1" required className="input" />
            <FieldError message={errors.weight_kg} />
          </Field>
          <Field label="الطول (سم)" htmlFor="height_cm">
            <input id="height_cm" name="height_cm" type="number" min="100" max="250" required className="input" />
            <FieldError message={errors.height_cm} />
          </Field>
          <Field label="العمر" htmlFor="age">
            <input id="age" name="age" type="number" min="13" max="100" required className="input" />
            <FieldError message={errors.age} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">خبرتك وخطتك</h2>
        <Field label="خبرتك في التمرين" htmlFor="experience">
          <select id="experience" name="experience" defaultValue="" required className="input">
            <option value="" disabled>اختر مستوى خبرتك</option>
            <option value="beginner">مبتدئ — لم أتمرن من قبل أو خبرتي قليلة</option>
            <option value="some">لدي خبرة سابقة، لكن توقفت أو أتمرن بشكل متقطع</option>
            <option value="experienced">أتمرن بانتظام منذ فترة</option>
          </select>
          <FieldError message={errors.experience} />
        </Field>
        <Field label="ما هدفك الأساسي من التمرين؟" htmlFor="goal">
          <textarea id="goal" name="goal" required maxLength={500} rows={3} className="input" placeholder="مثل: خسارة الدهون، زيادة العضلات، أو تحسين اللياقة…" />
          <FieldError message={errors.goal} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="كم يومًا تستطيع التمرن أسبوعيًا؟" htmlFor="training_days">
            <select id="training_days" name="training_days" defaultValue="" required className="input">
              <option value="" disabled>اختر عدد الأيام</option>
              {[1, 2, 3, 4, 5, 6, 7].map((days) => <option key={days} value={days}>{days} {days === 1 ? "يوم" : "أيام"}</option>)}
            </select>
            <FieldError message={errors.training_days} />
          </Field>
          <Field label="أين ستتمرن غالبًا؟" htmlFor="training_location">
            <select id="training_location" name="training_location" defaultValue="" required className="input">
              <option value="" disabled>اختر مكان التمرين</option>
              <option value="gym">جيم</option>
              <option value="home">المنزل</option>
              <option value="other">مكان آخر</option>
            </select>
            <FieldError message={errors.training_location} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">معلومات تساعد المدرب على إعداد خطة مناسبة</h2>
        <Field label="هل لديك إصابة أو حالة صحية أو دواء قد يؤثر على التمرين؟" htmlFor="health_flag">
          <select id="health_flag" name="health_flag" defaultValue="" required className="input">
            <option value="" disabled>اختر إجابتك</option>
            <option value="no">لا</option>
            <option value="yes">نعم</option>
          </select>
          <FieldError message={errors.health_flag} />
        </Field>
        <Field label="إذا كانت الإجابة نعم، اذكر التفاصيل أو أي حركة يجب تجنبها" htmlFor="health_notes">
          <textarea id="health_notes" name="health_notes" maxLength={1200} rows={3} className="input" />
          <FieldError message={errors.health_notes} />
        </Field>
        <Field label="حساسية الطعام أو تفضيلات غذائية أو معلومات أخرى" htmlFor="dietary_notes">
          <textarea id="dietary_notes" name="dietary_notes" maxLength={1200} rows={3} className="input" />
          <FieldError message={errors.dietary_notes} />
        </Field>
        <p className="text-xs leading-relaxed text-zinc-500">
          إذا كانت لديك حالة صحية أو إصابة، استشر مختصًا صحيًا قبل بدء التمرين. هذه البيانات لا تغني عن التقييم الطبي.
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">صور التقدم</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            ارفع صورًا واضحة من الأمام والجانب والخلف. الصور خاصة ولا يطلع عليها إلا المدرب من ملفك في لوحة الإدارة. الحد الأقصى لكل صورة 5 ميجابايت.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {([
            ["photo_front", "من الأمام"],
            ["photo_side", "من الجانب"],
            ["photo_back", "من الخلف"],
          ] as const).map(([field, label]) => (
            <Field key={field} label={label} htmlFor={field}>
              <input
                id={field}
                name={field}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                className="input px-2 py-2 text-xs file:ml-2 file:rounded-md file:border-0 file:bg-ink-700 file:px-2 file:py-1 file:text-xs file:text-zinc-200"
              />
              <FieldError message={errors[field]} />
            </Field>
          ))}
        </div>
        <label className="flex items-start gap-2.5 rounded-xl border border-ink-700 bg-ink-900/50 p-3 text-xs leading-relaxed text-zinc-300">
          <input name="photo_consent" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-accent-500" />
          <span>
            أوافق على حفظ بياناتي وصوري وإتاحتها لمدرب FA COACHING لمراجعة تقدمي وإعداد خطة التدريب. لن تكون الصور متاحة للمتدربين الآخرين.
            <FieldError message={errors.photo_consent} />
          </span>
        </label>
      </section>

      <SubmitButton className="btn-primary w-full" pendingLabel="جارٍ حفظ بياناتك…">
        حفظ وإكمال
      </SubmitButton>
    </form>
  );
}
