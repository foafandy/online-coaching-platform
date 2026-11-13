"use client";

import { useActionState } from "react";
import { createClientManagerAction, type TeamActionState } from "@/app/actions/team";
import { Alert, Field } from "./ui";
import { SubmitButton } from "./submit-button";

const initialState: TeamActionState = {};

export function TeamForm() {
  const [state, formAction] = useActionState(createClientManagerAction, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Field label="اسم الموظف" htmlFor="display_name">
        <input id="display_name" name="display_name" required maxLength={80} className="input" />
        {errors.display_name ? <p className="mt-1.5 text-xs text-red-300">{errors.display_name}</p> : null}
      </Field>
      <Field label="البريد الإلكتروني" htmlFor="email">
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        {errors.email ? <p className="mt-1.5 text-xs text-red-300">{errors.email}</p> : null}
      </Field>
      <Field label="كلمة المرور الأولية" htmlFor="password" hint="10 أحرف على الأقل. أرسلها للموظف بطريقة آمنة.">
        <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className="input" />
        {errors.password ? <p className="mt-1.5 text-xs text-red-300">{errors.password}</p> : null}
      </Field>
      <SubmitButton className="btn-primary w-full" pendingLabel="جارٍ إنشاء الحساب…">
        إنشاء حساب مسؤول عملاء
      </SubmitButton>
    </form>
  );
}
