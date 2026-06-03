"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
}

const SUGGESTIONS = [
  "Gợi ý lịch chơi 1 ngày cho gia đình có trẻ nhỏ",
  "Có những loại vé nào và giá bao nhiêu?",
  "Trò chơi cảm giác mạnh nào đáng thử nhất?",
  "Giờ mở cửa và lịch diễn hôm nay?",
];

function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = messages.length > 0;

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
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: createId(),
      role: "user",
      content: trimmed,
    };
    const history = [...messages, userMsg];

    setMessages(history);
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
          if (data?.error && typeof data.error === "string") {
            errMsg = data.error;
          }
        } catch {
          /* body không phải JSON */
        }
        throw new Error(errMsg);
      }

      if (!res.body) {
        throw new Error("Phản hồi không hợp lệ");
      }

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m
            )
          );
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Xin lỗi, đã có lỗi khi kết nối tới máy chủ. Vui lòng thử lại.";
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: msg,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="flex h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
            <FerrisIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">
              Trợ lý VinWonders
            </h1>
            <p className="text-xs text-muted">Tư vấn dịch vụ vui chơi</p>
          </div>
        </div>
        {hasMessages && (
          <button
            onClick={() => setMessages([])}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-background"
          >
            Trò chuyện mới
          </button>
        )}
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="scroll-area flex-1 overflow-y-auto px-4 py-6 sm:px-0"
      >
        <div className="mx-auto w-full max-w-3xl space-y-6">
          {!hasMessages && <Welcome onPick={(s) => sendMessage(s)} />}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {isLoading &&
            messages[messages.length - 1]?.role === "user" && (
              <TypingIndicator />
            )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-surface/80 px-4 py-4 backdrop-blur sm:px-0">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm focus-within:border-accent">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Hỏi về vé, trò chơi, lịch diễn, ăn uống tại VinWonders..."
              className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Gửi"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted">
            Thông tin chỉ mang tính tham khảo. Vui lòng kiểm tra lại giá vé và
            lịch diễn chính thức trước khi đi.
          </p>
        </form>
      </div>
    </div>
  );
}

function Welcome({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 pt-10 text-center animate-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-lg">
        <FerrisIcon className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-semibold">
        Chào mừng đến VinWonders! Mình giúp gì cho chuyến đi của bạn?
      </h2>
      <p className="mt-1 max-w-md text-sm text-muted">
        Mình tư vấn vé, trò chơi, lịch diễn, ăn uống và lên lịch trình. Chọn một
        gợi ý bên dưới để bắt đầu.
      </p>
      <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm transition hover:border-accent hover:shadow-sm"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex items-start gap-3 animate-in ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${
          isUser ? "bg-zinc-500" : "bg-accent"
        }`}
      >
        {isUser ? (
          <UserIcon className="h-4 w-4" />
        ) : (
          <FerrisIcon className="h-4 w-4" />
        )}
      </div>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-tr-sm bg-accent text-white"
            : "rounded-tl-sm border border-border bg-surface"
        }`}
      >
        {message.content || "..."}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-in">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
        <FerrisIcon className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3.5 shadow-sm">
        <span className="typing-dot h-2 w-2 rounded-full bg-muted [animation-delay:0ms]" />
        <span className="typing-dot h-2 w-2 rounded-full bg-muted [animation-delay:200ms]" />
        <span className="typing-dot h-2 w-2 rounded-full bg-muted [animation-delay:400ms]" />
      </div>
    </div>
  );
}

function FerrisIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  );
}
