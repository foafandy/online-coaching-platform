"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resetPasswordAction,
  type AuthState,
} from "@/app/actions/auth";
import { Alert, Field } from "./ui";
import { SubmitButton } from "./submit-button";

const initial: AuthState = {};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-red-300">{message}</p>;
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, formAction] = useActionState(loginAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="البريد الإلكتروني" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@example.com"
          className="input"
        />
      </Field>
      <Field label="كلمة المرور" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="input"
        />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs font-medium text-accent-400 hover:underline">
          نسيت كلمة المرور؟
        </Link>
      </div>
      <SubmitButton className="btn-primary w-full" pendingLabel="جارٍ تسجيل الدخول…">
        تسجيل الدخول
      </SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initial);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field label="الاسم الكامل" htmlFor="full_name">
        <input
          id="full_name"
          name="full_name"
          required
          autoComplete="name"
          placeholder="الاسم الكامل"
          className="input"
        />
        <FieldError message={errors.full_name} />
      </Field>
      <Field label="البريد الإلكتروني" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="name@example.com"
          className="input"
        />
        <FieldError message={errors.email} />
      </Field>
      <Field label="رقم الهاتف" htmlFor="phone">
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="+20 100 123 4567"
          className="input"
        />
        <FieldError message={errors.phone} />
      </Field>
      <Field label="الدولة" htmlFor="country">
        <input
          id="country"
          name="country"
          required
          autoComplete="country-name"
          placeholder="مثال: مصر"
          className="input"
        />
        <FieldError message={errors.country} />
      </Field>
      <Field label="كلمة المرور" htmlFor="password" hint="8 أحرف على الأقل.">
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          className="input"
        />
        <FieldError message={errors.password} />
      </Field>
      <Field label="تأكيد كلمة المرور" htmlFor="confirm_password">
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          className="input"
        />
        <FieldError message={errors.confirm_password} />
      </Field>
      <SubmitButton className="btn-primary w-full" pendingLabel="جارٍ إنشاء الحساب…">
        إنشاء الحساب
      </SubmitButton>
      <p className="text-center text-[11px] leading-relaxed text-zinc-500">
        تتم مراجعة الحسابات الجديدة من قِبل FA COACHING قبل إتاحة الخطط.
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      {state.devLink ? (
        <div className="rounded-xl border border-ink-700 bg-ink-900/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            وضع التطوير — البريد الإلكتروني غير مُعدّ
          </p>
          <Link
            href={state.devLink}
            className="mt-1.5 block break-all text-xs font-medium text-accent-400 hover:underline"
          >
            {state.devLink}
          </Link>
        </div>
      ) : null}
      <Field label="البريد الإلكتروني" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="name@example.com"
          className="input"
        />
      </Field>
      <SubmitButton className="btn-primary w-full" pendingLabel="جارٍ الإرسال…">
        إرسال رابط إعادة التعيين
      </SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initial);
  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <input type="hidden" name="token" value={token} />
      <Field label="كلمة المرور الجديدة" htmlFor="password" hint="8 أحرف على الأقل.">
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="input"
        />
      </Field>
      <Field label="تأكيد كلمة المرور الجديدة" htmlFor="confirm_password">
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          autoComplete="new-password"
          className="input"
        />
      </Field>
      <SubmitButton className="btn-primary w-full" pendingLabel="جارٍ التحديث…">
        تعيين كلمة مرور جديدة
      </SubmitButton>
    </form>
  );
}
