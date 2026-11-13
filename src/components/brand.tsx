import Link from "next/link";
import Image from "next/image";

export function Brand({
  href = "/",
  compact = false,
  className = "",
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/fa-logo.jpg"
        alt="FA"
        width={36}
        height={36}
        className="h-9 w-9 rounded-xl object-cover"
      />
      <span className="leading-none">
        <span className="block font-display text-lg tracking-[0.12em] text-white">FA COACHING</span>
        {!compact ? (
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.34em] text-zinc-500">
            التدريب الاحترافي أونلاين
          </span>
        ) : null}
      </span>
    </Link>
  );
}
