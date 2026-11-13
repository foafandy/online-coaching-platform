"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  updateProfileAction,
  uploadAvatarAction,
} from "@/app/actions/client";
import { Alert, Field } from "./ui";
import { SubmitButton } from "./submit-button";

type State = { error?: string; success?: string };
const initial: State = {};

function Note({ state }: { state: State }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

export function ProfileForm({
  profile,
}: {
  profile: {
    full_name: string;
    phone: string | null;
    country: string | null;
    goal: string | null;
  };
}) {
  const [state, formAction] = useActionState(updateProfileAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <Note state={state} />
      <Field label="الاسم الكامل" htmlFor="full_name">
        <input id="full_name" name="full_name" defaultValue={profile.full_name} required className="input" />
      </Field>
      <Field label="رقم الهاتف" htmlFor="phone">
        <input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} className="input" />
      </Field>
      <Field label="الدولة" htmlFor="country">
        <input id="country" name="country" defaultValue={profile.country ?? ""} className="input" />
      </Field>
      <Field label="هدفك" htmlFor="goal" hint="اكتب الهدف الذي تسعى لتحقيقه.">
        <textarea
          id="goal"
          name="goal"
          rows={3}
          defaultValue={profile.goal ?? ""}
          className="input resize-y"
        />
      </Field>
      <SubmitButton className="btn-primary">حفظ التغييرات</SubmitButton>
    </form>
  );
}

export function AvatarForm() {
  const [state, formAction] = useActionState(uploadAvatarAction, initial);
  return (
    <form action={formAction} className="space-y-3">
      <Note state={state} />
      <input
        type="file"
        name="avatar"
        accept="image/jpeg,image/png,image/webp"
        required
        className="w-full text-xs text-zinc-400 file:ml-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-200"
      />
      <SubmitButton className="btn-ghost btn-sm" pendingLabel="جارٍ الرفع…">
        رفع الصورة
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      <Note state={state} />
      <Field label="كلمة المرور الحالية" htmlFor="current_password">
        <input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="كلمة المرور الجديدة" htmlFor="new_password">
          <input
            id="new_password"
            name="new_password"
            type="password"
            autoComplete="new-password"
            required
            className="input"
          />
        </Field>
        <Field label="تأكيد كلمة المرور الجديدة" htmlFor="confirm_password">
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            className="input"
          />
        </Field>
      </div>
      <SubmitButton className="btn-primary">تحديث كلمة المرور</SubmitButton>
    </form>
  );
}
