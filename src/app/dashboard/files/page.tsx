import { Download, ExternalLink, FileText, FolderOpen, ImageIcon, Video } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { listClientFiles } from "@/lib/data";
import { EmptyState, PageHeader, formatBytes, formatDate } from "@/components/ui";
import { FILE_CATEGORY_LABELS, type FileCategory, type FileRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  if (mime.startsWith("video/")) return <Video className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export default async function ClientFilesPage() {
  const { profile } = await requireClient();
  const files = listClientFiles(profile.id);

  const grouped = (Object.keys(FILE_CATEGORY_LABELS) as FileCategory[])
    .map((category) => ({
      category,
      label: FILE_CATEGORY_LABELS[category],
      items: files.filter((file) => file.category === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        eyebrow="المكتبة"
        title="ملفاتي"
        description="كل ما شاركه FA COACHING معك."
      />

      {files.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
          title="لا توجد ملفات حتى الآن"
          description="ستظهر هنا ملفات PDF للتغذية وصور التقدم وفيديوهات التمارين وأدلة المكملات."
        />
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.category}>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">{group.label}</h2>
                <span className="text-[11px] uppercase tracking-[0.1em] text-zinc-600">
                  {group.items.length} ملف
                </span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {group.items.map((file: FileRow) => (
                  <article
                    key={file.id}
                    className="card group flex items-start gap-3 p-4 transition hover:border-accent-600/30"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-800 text-accent-500">
                      <FileIcon mime={file.mime_type} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">{file.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
                      </p>
                      {file.description ? (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                          {file.description}
                        </p>
                      ) : null}
                      <div className="mt-2.5 flex items-center gap-3">
                        <a
                          href={`/api/files/${file.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-400 hover:underline"
                        >
                          فتح <ExternalLink className="h-3 w-3" />
                        </a>
                        <a
                          href={`/api/files/${file.id}?download=1`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-300"
                        >
                          تنزيل <Download className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
