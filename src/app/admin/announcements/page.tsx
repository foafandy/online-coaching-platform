import { Megaphone, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listAllAnnouncements } from "@/lib/data";
import { deleteAnnouncementAction, toggleAnnouncementAction } from "@/app/actions/admin";
import { AnnouncementForm } from "@/components/admin-forms";
import { EmptyState, PageHeader, SectionCard, formatDate } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const announcements = listAllAnnouncements();

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="التواصل"
        title="الإعلانات"
        description="تظهر الإعلانات المنشورة في لوحة كل عميل نشط، ويصله إشعار بها."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="h-6 w-6" />}
              title="لا توجد إعلانات حتى الآن"
              description="انشر تذكيرًا بمتابعة التقدم أو تغييرًا في المواعيد أو رسالة تحفيزية."
            />
          ) : (
            announcements.map((announcement) => (
              <article key={announcement.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-white">{announcement.title}</h2>
                      <span
                        className={`badge ${
                          announcement.is_active
                            ? "border-accent-600/30 bg-accent-500/10 text-accent-400"
                            : "border-ink-600 bg-ink-800 text-zinc-500"
                        }`}
                      >
                        {announcement.is_active ? "منشور" : "مسودة"}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                      {announcement.body}
                    </p>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.1em] text-zinc-600">
                      {formatDate(announcement.created_at, true)}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <form action={toggleAnnouncementAction}>
                      <input type="hidden" name="announcement_id" value={announcement.id} />
                      <SubmitButton className="btn-ghost btn-sm" pendingLabel="…">
                        {announcement.is_active ? "إلغاء النشر" : "نشر"}
                      </SubmitButton>
                    </form>
                    <form action={deleteAnnouncementAction}>
                      <input type="hidden" name="announcement_id" value={announcement.id} />
                      <SubmitButton
                        className="btn-ghost btn-sm text-red-300"
                        confirm="هل تريد حذف هذا الإعلان؟"
                        pendingLabel="…"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SectionCard title="إعلان جديد" description="أرسل إشعارًا فوريًا إلى عملائك النشطين.">
            <AnnouncementForm />
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
