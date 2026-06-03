"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DiscoveryPanel from "./DiscoveryPanel";
import {
  QUICK_CHIPS,
  VINWONDERS_SPOTS,
  WELCOME_MESSAGE,
  filterSpotsByText,
  type Spot,
} from "../data/spots";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
}

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: WELCOME_MESSAGE,
};

function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function renderMarkdown(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const visibleSpots = useMemo(
    () => filterSpotsByText(lastQuery, VINWONDERS_SPOTS),
    [lastQuery]
  );

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  function toggleSpot(spot: Spot) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(spot.id)) next.delete(spot.id);
      else next.add(spot.id);
      return next;
    });
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setLastQuery(trimmed);
    setDiscoveryOpen(true);

    const userMsg: Message = {
      id: createId(),
      role: "user",
      content: trimmed,
    };
    const history = [...messages, userMsg].filter((m) => m.id !== "welcome");

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantId = createId();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        let errMsg = "Phản hồi không hợp lệ";
        try {
          const data = await res.json();
          if (data?.error && typeof data.error === "string") errMsg = data.error;
        } catch {
          /* ignore */
        }
        throw new Error(errMsg);
      }

      if (!res.body) throw new Error("Phản hồi không hợp lệ");

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          full += decoder.decode(value, { stream: true });
          setLastQuery(full);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: full } : m
            )
          );
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Xin lỗi, đã có lỗi. Vui lòng thử lại.";
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: msg },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleChip(chip: string) {
    const mapped =
      chip === "Surprise me"
        ? "Gợi ý bất ngờ cho chuyến đi VinWonders cuối tuần"
        : chip === "Cuối tuần này"
          ? "Lên lịch chơi VinWonders cuối tuần này cho 2 người lớn"
          : chip === "Gia đình có trẻ nhỏ"
            ? "Gợi ý lịch chơi 1 ngày cho gia đình có trẻ nhỏ"
            : "Trò chơi cảm giác mạnh nào đáng thử nhất?";
    sendMessage(mapped);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function resetChat() {
    setMessages([INITIAL_MESSAGE]);
    setSelectedIds(new Set());
    setLastQuery("");
    setInput("");
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* ── Left: Chat panel (Layla-style) ── */}
      <section className="flex w-full min-w-0 flex-col border-r border-border bg-surface lg:max-w-[420px] xl:max-w-[440px]">
        {/* Logo */}
        <header className="flex items-center justify-between px-5 py-4">
          <span className="text-xl font-bold tracking-tight">
            VinWonders<span className="text-accent">.</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDiscoveryOpen(true)}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium lg:hidden"
            >
              Khám phá
            </button>
            {messages.length > 1 && (
              <button
                type="button"
                onClick={resetChat}
                className="text-xs text-muted hover:text-foreground"
              >
                Mới
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="scroll-area flex-1 overflow-y-auto px-5">
          <div className="space-y-6 pb-4 pt-2">
            {messages.map((m) => (
              <div key={m.id} className="animate-in">
                {m.role === "assistant" ? (
                  <AssistantMessage content={m.content} />
                ) : (
                  <p className="ml-auto max-w-[85%] rounded-2xl bg-[#f3f4f6] px-4 py-2.5 text-sm leading-relaxed">
                    {m.content}
                  </p>
                )}
              </div>
            ))}

            {isLoading &&
              messages[messages.length - 1]?.role === "user" && (
                <TypingIndicator />
              )}

            {/* Quick chips — ngay dưới tin nhắn bot cuối (Layla behavior) */}
            {!isLoading && lastAssistant && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChip(chip)}
                    className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-foreground transition hover:border-accent hover:bg-accent/5"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Composer — Layla "Ask anything..." */}
        <footer className="border-t border-border px-4 py-4">
          <form onSubmit={handleSubmit}>
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-[#fafafa] px-3 py-2 shadow-sm focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/10">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Hỏi bất cứ điều gì..."
                className="max-h-[120px] min-h-[24px] flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted"
              />
              <div className="flex shrink-0 items-center gap-1 pb-0.5">
                <button
                  type="button"
                  className="hidden rounded-full p-2 text-muted hover:bg-black/5 sm:block"
                  aria-label="Lịch"
                >
                  <CalendarIcon className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white transition enabled:hover:bg-accent-hover disabled:opacity-40"
                  aria-label="Gửi"
                >
                  <SendIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
          <p className="mt-2 text-center text-[10px] text-muted">
            Thông tin tham khảo · Kiểm tra giá vé chính thức trước khi đi
          </p>
        </footer>
      </section>

      {/* ── Right: Discovery panel ── */}
      <div className="hidden min-w-0 flex-1 lg:flex">
        <DiscoveryPanel
          spots={visibleSpots}
          selectedIds={selectedIds}
          onToggleSpot={toggleSpot}
          mobileOpen={discoveryOpen}
          onCloseMobile={() => setDiscoveryOpen(false)}
        />
      </div>

      {/* Mobile discovery overlay */}
      <div className="lg:hidden">
        <DiscoveryPanel
          spots={visibleSpots}
          selectedIds={selectedIds}
          onToggleSpot={toggleSpot}
          mobileOpen={discoveryOpen}
          onCloseMobile={() => setDiscoveryOpen(false)}
        />
      </div>
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  if (!content) return <TypingIndicator />;

  return (
    <div className="space-y-2">
      <div
        className="chat-markdown text-sm leading-relaxed text-foreground/90"
        dangerouslySetInnerHTML={{
          __html: renderMarkdown(content).replace(/\n/g, "<br />"),
        }}
      />
      <button
        type="button"
        className="text-muted hover:text-foreground"
        aria-label="Sao chép"
        onClick={() => navigator.clipboard?.writeText(content)}
      >
        <CopyIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 py-2">
      <span className="typing-dot h-2 w-2 rounded-full bg-muted" />
      <span className="typing-dot h-2 w-2 rounded-full bg-muted [animation-delay:200ms]" />
      <span className="typing-dot h-2 w-2 rounded-full bg-muted [animation-delay:400ms]" />
    </div>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.4 20.4 21 12 3.4 3.6l1.8 7.2L16 12l-10.8 1.2-1.8 7.2Z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
