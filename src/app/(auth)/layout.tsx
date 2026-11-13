import Link from "next/link";
import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between p-5">
        <Brand />
        <Link href="/login" className="text-xs font-medium text-zinc-500 hover:text-zinc-300">
          العودة لتسجيل الدخول
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px] animate-fade-up">{children}</div>
      </div>
      <div className="px-5 pb-6 text-center lg:hidden">
        <Link href="/" className="text-[11px] text-zinc-600 hover:text-zinc-400">
          © {new Date().getFullYear()} FA COACHING
        </Link>
      </div>
    </div>
  );
}
