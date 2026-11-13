import { MessageCircle } from "lucide-react";
import { requireClient, canAccessClientChat } from "@/lib/auth";
import { ChatPanel } from "@/components/chat-panel";
import { PageHeader, SectionCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClientChatPage() {
  const session = await requireClient();
  const profile = session.profile;

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        eyebrow="تواصل مباشر"
        title="محادثتك مع الكوتش"
        description="يمكنك إرسال الرسائل والصور والملفات، وستظل محفوظة في سجل المحادثة."
      />
      {canAccessClientChat(session, profile.id) ? (
        <ChatPanel clientId={profile.id} viewerId={session.user.id} />
      ) : (
        <SectionCard title="الشات غير متاح حاليًا">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <MessageCircle className="h-5 w-5 shrink-0 text-accent-400" />
            لم يتم تعيين مسؤول لهذا الحساب بعد. ستتمكن من استخدام المحادثة بعد تعيينه.
          </div>
        </SectionCard>
      )}
    </div>
  );
}
