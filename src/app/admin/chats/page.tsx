import Link from "next/link";
import { MessageCircle, Paperclip } from "lucide-react";
import { requireClientManager } from "@/lib/auth";
import { listChatConversations } from "@/lib/data";
import { EmptyState, PageHeader, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminChatsPage() {
  const session = await requireClientManager();
  const conversations = listChatConversations(
    session.user.admin_scope === "clients" ? session.user.id : undefined,
  );

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="التواصل"
        title="محادثات المتدربين"
        description="افتح محادثة المتدرب لمتابعة الرسائل والملفات المرسلة."
      />
      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-6 w-6" />}
          title="لا توجد محادثات"
          description="ستظهر هنا محادثات المتدربين المعيّنين لك."
        />
      ) : (
        <ul className="space-y-2">
          {conversations.map((conversation) => (
            <li key={conversation.client_id}>
              <Link
                href={`/admin/clients/${conversation.client_id}/chat`}
                className="card flex items-center justify-between gap-4 p-4 transition hover:border-accent-600/40"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-500/10 text-xs font-bold text-accent-400">
                    {conversation.full_name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {conversation.full_name}
                    </span>
                    <span className="mt-1 flex items-center gap-1 truncate text-xs text-zinc-400">
                      {conversation.last_attachment ? (
                        <>
                          <Paperclip className="h-3 w-3 shrink-0" />
                          {conversation.last_message || conversation.last_attachment}
                        </>
                      ) : (
                        conversation.last_message ?? "ابدأ المحادثة"
                      )}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-[10px] text-zinc-500">
                  {conversation.last_message_at ? formatDate(conversation.last_message_at, true) : ""}
                  <MessageCircle className="h-4 w-4 text-accent-400" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
