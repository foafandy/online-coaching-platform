import { LogOut } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { AvatarForm, PasswordForm, ProfileForm } from "@/components/client-forms";
import { PageHeader, SectionCard, StatusBadge, formatDate } from "@/components/ui";
import { CLIENT_STATUS_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClientProfilePage() {
  const { user, profile } = await requireClient();
  const avatarUrl = profile.avatar_path
    ? `/api/avatar/${user.id}?v=${encodeURIComponent(profile.updated_at)}`
    : null;

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        eyebrow="الحساب"
        title="ملفي الشخصي"
        description="احرص على تحديث بياناتك ليستفيد منها مدربك عند إعداد الخطط."
      />

      <section className="card flex flex-wrap items-center gap-5 p-6">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={profile.full_name}
            className="h-20 w-20 rounded-2xl object-cover ring-1 ring-ink-600"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-ink-800 text-xl font-bold text-zinc-400">
            {profile.full_name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-white">{profile.full_name}</h2>
          <p className="truncate text-sm text-zinc-500">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={profile.status} />
            <span className="text-[11px] uppercase tracking-[0.1em] text-zinc-600">
              عضو منذ {formatDate(profile.created_at)}
            </span>
          </div>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn-ghost btn-sm">
            <LogOut className="h-3.5 w-3.5" /> تسجيل الخروج
          </button>
        </form>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="البيانات الشخصية">
          <ProfileForm profile={profile} />
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="الصورة الشخصية" description="بصيغة JPG أو PNG أو WEBP، وبحجم لا يتجاوز 5 ميجابايت.">
            <AvatarForm />
          </SectionCard>

          <SectionCard title="كلمة المرور" description="استخدم 8 أحرف على الأقل.">
            <PasswordForm />
          </SectionCard>
        </div>
      </div>

      <SectionCard title="معلومات الحساب">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-ink-800 bg-ink-900/50 p-3.5">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              البريد الإلكتروني
            </dt>
            <dd className="mt-1 truncate text-zinc-200">{user.email}</dd>
          </div>
          <div className="rounded-xl border border-ink-800 bg-ink-900/50 p-3.5">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              الحالة
            </dt>
            <dd className="mt-1 text-zinc-200">{CLIENT_STATUS_LABELS[profile.status]}</dd>
          </div>
          <div className="rounded-xl border border-ink-800 bg-ink-900/50 p-3.5">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              تاريخ التسجيل
            </dt>
            <dd className="mt-1 text-zinc-200">{formatDate(user.created_at)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
          تريد تغيير بريدك الإلكتروني؟ تواصل مع مدربك، إذ تُدار تغييرات البريد من لوحة المدرب.
        </p>
      </SectionCard>
    </div>
  );
}
