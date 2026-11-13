import Link from "next/link";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Brand />
      <p className="mt-8 font-display text-5xl text-white">404</p>
      <p className="mt-2 text-sm text-zinc-400">هذه الصفحة غير موجودة أو ليس لديك صلاحية الوصول إليها.</p>
      <div className="mt-6 flex gap-2">
        <Link href="/dashboard" className="btn-primary btn-sm">
          لوحة التحكم
        </Link>
        <Link href="/" className="btn-ghost btn-sm">
          الرئيسية
        </Link>
      </div>
    </div>
  );
}
