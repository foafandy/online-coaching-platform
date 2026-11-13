import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAssignedClient } from "@/lib/auth";
import { getClientById } from "@/lib/data";
import { ChatPanel } from "@/components/chat-panel";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminClientChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAssignedClient(id);
  const client = getClientById(id);
  if (!client) notFound();

  return (
    <div className="animate-fade-up space-y-5">
      <Link
        href={`/admin/clients/${client.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
      >
        <ArrowRight className="h-3.5 w-3.5" /> العودة إلى ملف المتدرب
      </Link>
      <PageHeader
        eyebrow="محادثة محفوظة"
        title={client.full_name}
        description={`محادثة خاصة بين ${client.full_name} ومسؤوله.`}
      />
      <ChatPanel clientId={client.id} viewerId={session.user.id} />
    </div>
  );
}
