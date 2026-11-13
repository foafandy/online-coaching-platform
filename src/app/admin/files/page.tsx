import Link from "next/link";
import { Download, ExternalLink, FileText, Trash2, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getFileClientIds, listClients, listFiles } from "@/lib/data";
import { deleteFileAction } from "@/app/actions/admin";
import { ReplaceFileForm, UpdateFileForm, UploadFilesForm } from "@/components/admin-forms";
import {
  CategoryBadge,
  EmptyState,
  PageHeader,
  SectionCard,
  formatBytes,
  formatDate,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { FILE_CATEGORY_LABELS, type FileCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminFilesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const category = params.category ?? "all";
  const files = listFiles({ category });
  const clients = listClients();
  const clientOptions = clients.map((client) => ({
    id: client.id,
    full_name: client.full_name,
    email: client.email,
  }));

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="المكتبة"
        title="الملفات والخطط"
        description="ارفع ملفات PDF والصور والفيديوهات، ثم عيّنها للعملاء الذين تريد إتاحتها لهم."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/files"
              className={`badge ${
                category === "all"
                  ? "border-accent-600/40 bg-accent-500/10 text-accent-400"
                  : "border-ink-700 bg-ink-800 text-zinc-400"
              }`}
            >
              كل الملفات
            </Link>
            {(Object.keys(FILE_CATEGORY_LABELS) as FileCategory[]).map((key) => (
              <Link
                key={key}
                href={`/admin/files?category=${key}`}
                className={`badge ${
                  category === key
                    ? "border-accent-600/40 bg-accent-500/10 text-accent-400"
                    : "border-ink-700 bg-ink-800 text-zinc-400"
                }`}
              >
                {FILE_CATEGORY_LABELS[key]}
              </Link>
            ))}
          </div>

          {files.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="لا توجد ملفات في هذا التصنيف"
              description="ارفع ملفك الأول من اللوحة الجانبية. تظل الملفات خاصة حتى تعيينها."
            />
          ) : (
            <div className="space-y-3">
              {files.map((file) => {
                const assigned = getFileClientIds(file.id);
                return (
                  <article key={file.id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-sm font-semibold text-white">{file.title}</h2>
                          <CategoryBadge category={file.category} />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {file.original_name} · {formatBytes(file.size_bytes)} ·{" "}
                          {formatDate(file.created_at)}
                        </p>
                        {file.description ? (
                          <p className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-400">
                            {file.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/api/files/${file.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-ink-700 p-2 text-zinc-400 transition hover:text-accent-400"
                          title="فتح"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={`/api/files/${file.id}?download=1`}
                          className="rounded-lg border border-ink-700 p-2 text-zinc-400 transition hover:text-accent-400"
                          title="تنزيل"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <form action={deleteFileAction}>
                          <input type="hidden" name="file_id" value={file.id} />
                          <SubmitButton
                            className="btn-ghost btn-sm text-red-300"
                            confirm={`هل تريد حذف «${file.title}»؟ سيختفي من حسابات العملاء.`}
                            pendingLabel="…"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </SubmitButton>
                        </form>
                      </div>
                    </div>

                    <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                      <Users className="h-3.5 w-3.5" />
                      {file.client_count === 0
                        ? "غير معيّن لأي عميل"
                        : `معيّن إلى ${file.client_count} عميل`}
                    </p>

                    <details className="mt-3 border-t border-ink-800 pt-3">
                      <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-300">
                        إدارة الملف
                      </summary>
                      <div className="mt-4 space-y-5">
                        <UpdateFileForm
                          file={{
                            id: file.id,
                            title: file.title,
                            description: file.description,
                            category: file.category,
                          }}
                          clients={clientOptions}
                          assigned={assigned}
                        />
                        <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                            استبدال محتوى الملف
                          </p>
                          <ReplaceFileForm fileId={file.id} />
                        </div>
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SectionCard title="رفع الملفات" description="تظل الملفات خاصة حتى تعيينها للعملاء.">
            <UploadFilesForm clients={clientOptions} />
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
