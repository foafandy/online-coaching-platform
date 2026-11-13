"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Download, FileText, Paperclip, Send } from "lucide-react";
import { formatBytes, formatDate } from "@/components/ui";

type ChatMessage = {
  id: number;
  sender_user_id: string;
  sender_role: "admin" | "client";
  sender_name: string;
  body: string | null;
  attachment_original_name: string | null;
  attachment_mime_type: string | null;
  attachment_size_bytes: number | null;
  created_at: string;
};

const POLL_INTERVAL_MS = 3000;
const ACCEPTED_FILES = "image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv,.docx";

export function ChatPanel({
  clientId,
  viewerId,
}: {
  clientId: string;
  viewerId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const lastMessageId = useRef(0);
  const shouldScrollToBottom = useRef(false);

  const loadLatest = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat/${clientId}`, { cache: "no-store" });
      const data = (await response.json()) as {
        messages?: ChatMessage[];
        hasMore?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "تعذر تحميل المحادثة.");
      setMessages((current) => {
        const byId = new Map(current.map((item) => [item.id, item]));
        for (const item of data.messages ?? []) byId.set(item.id, item);
        const next = [...byId.values()].sort((a, b) => a.id - b.id);
        lastMessageId.current = Math.max(lastMessageId.current, next.at(-1)?.id ?? 0);
        return next;
      });
      setHasMore(Boolean(data.hasMore));
      setError("");
      if (!initialized.current) {
        initialized.current = true;
        shouldScrollToBottom.current = true;
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل المحادثة.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const pollNewMessages = useCallback(async () => {
    if (!initialized.current) return;
    try {
      const response = await fetch(
        `/api/chat/${clientId}?after=${lastMessageId.current}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        messages?: ChatMessage[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "تعذر تحديث المحادثة.");
      const incoming = data.messages ?? [];
      if (incoming.length) {
        setMessages((current) => {
          const known = new Set(current.map((item) => item.id));
          const next = [...current, ...incoming.filter((item) => !known.has(item.id))];
          lastMessageId.current = Math.max(lastMessageId.current, next.at(-1)?.id ?? 0);
          return next;
        });
        shouldScrollToBottom.current = true;
      }
      setError("");
    } catch (pollError) {
      setError(pollError instanceof Error ? pollError.message : "تعذر تحديث المحادثة.");
    }
  }, [clientId]);

  useEffect(() => {
    void loadLatest();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void pollNewMessages();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadLatest, pollNewMessages]);

  useEffect(() => {
    if (shouldScrollToBottom.current) {
      shouldScrollToBottom.current = false;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  async function loadOlder() {
    if (!messages.length) return;
    const container = scrollRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    try {
      const response = await fetch(
        `/api/chat/${clientId}?before=${messages[0].id}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        messages?: ChatMessage[];
        hasMore?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "تعذر تحميل الرسائل السابقة.");
      setMessages((current) => [...(data.messages ?? []), ...current]);
      setHasMore(Boolean(data.hasMore));
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - previousHeight;
      });
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل الرسائل السابقة.");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/chat/${clientId}`, {
        method: "POST",
        body: new FormData(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذر إرسال الرسالة.");
      setMessage("");
      form.reset();
      shouldScrollToBottom.current = true;
      await loadLatest();
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "تعذر إرسال الرسالة.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card overflow-hidden">
      <div
        ref={scrollRef}
        className="flex h-[min(62vh,640px)] min-h-[360px] flex-col gap-3 overflow-y-auto bg-ink-950/40 p-4 sm:p-6"
        aria-live="polite"
      >
        {hasMore ? (
          <button type="button" className="btn-ghost btn-sm mx-auto" onClick={loadOlder}>
            تحميل رسائل أقدم
          </button>
        ) : null}
        {loading ? (
          <p className="m-auto text-sm text-zinc-500">جارٍ تحميل المحادثة…</p>
        ) : messages.length === 0 ? (
          <div className="m-auto text-center">
            <p className="text-sm font-medium text-zinc-300">ابدأ المحادثة</p>
            <p className="mt-1 text-xs text-zinc-500">رسائلك ومرفقاتك محفوظة هنا.</p>
          </div>
        ) : (
          messages.map((item) => {
            const own = item.sender_user_id === viewerId;
            const attachmentUrl = `/api/chat/${clientId}/attachments/${item.id}`;
            return (
              <article
                key={item.id}
                className={`max-w-[88%] rounded-2xl border px-3.5 py-2.5 sm:max-w-[75%] ${
                  own
                    ? "ml-auto border-accent-600/30 bg-accent-500/10"
                    : "mr-auto border-ink-700 bg-ink-900"
                }`}
              >
                <p className="mb-1 text-[10px] font-semibold text-accent-400">{item.sender_name}</p>
                {item.body ? (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-100">
                    {item.body}
                  </p>
                ) : null}
                {item.attachment_original_name ? (
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex items-center gap-2 rounded-lg border border-ink-700/80 bg-black/10 p-2 text-xs text-zinc-200 hover:text-accent-300"
                  >
                    {item.attachment_mime_type?.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={attachmentUrl}
                        alt={item.attachment_original_name}
                        className="max-h-56 max-w-full rounded-md object-contain"
                      />
                    ) : (
                      <>
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{item.attachment_original_name}</span>
                          {item.attachment_size_bytes ? (
                            <span className="text-[10px] text-zinc-500">
                              {formatBytes(item.attachment_size_bytes)}
                            </span>
                          ) : null}
                        </span>
                        <Download className="h-3.5 w-3.5 shrink-0" />
                      </>
                    )}
                  </a>
                ) : null}
                <time className="mt-1.5 block text-left text-[10px] text-zinc-500">
                  {formatDate(item.created_at, true)}
                </time>
              </article>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t border-ink-800 p-3 sm:p-4">
        {error ? (
          <p role="alert" className="mb-2 text-xs text-red-300">
            {error}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-ink-700 text-zinc-400 hover:text-accent-400">
            <Paperclip className="h-4 w-4" />
            <span className="sr-only">إرفاق صورة أو ملف</span>
            <input
              type="file"
              name="attachment"
              accept={ACCEPTED_FILES}
              className="sr-only"
            />
          </label>
          <textarea
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={5000}
            rows={1}
            placeholder="اكتب رسالتك…"
            className="input min-h-11 flex-1 resize-y py-2.5"
          />
          <button
            type="submit"
            disabled={sending}
            className="btn-primary h-11 w-11 shrink-0 justify-center px-0 disabled:opacity-50"
            aria-label="إرسال الرسالة"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-zinc-600">
          صور أو PDF أو TXT أو CSV أو DOCX، بحد أقصى 20 ميجابايت.
        </p>
      </form>
    </section>
  );
}
