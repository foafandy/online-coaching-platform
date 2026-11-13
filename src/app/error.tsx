"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">حدث خطأ ما</p>
      <h1 className="mt-3 text-2xl font-semibold text-white">تعذّر تحميل هذه الصفحة</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        ربما تعذّر تنفيذ الإجراء أو انتهت صلاحية جلستك. حاول مرة أخرى، وإذا استمرت المشكلة فأعد
        تحميل الصفحة أو سجّل الدخول مجددًا.
      </p>
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={reset} className="btn-primary btn-sm">
          حاول مرة أخرى
        </button>
        <a href="/login" className="btn-ghost btn-sm">
          تسجيل الدخول
        </a>
      </div>
    </div>
  );
}
