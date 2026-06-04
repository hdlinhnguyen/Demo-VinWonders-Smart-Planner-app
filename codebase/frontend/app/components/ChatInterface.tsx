"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import ChatMarkdown from "./ChatMarkdown";
import ChatSpotCards from "./ChatSpotCards";
import DiscoveryPanel from "./DiscoveryPanel";
import ResizeHandle from "./ResizeHandle";
import {
  parseAssistantContent,
  resolveChatCardEntries,
  type ChatCardEntry,
} from "../data/chatCards";
import {
  loadSelectedSpotIds,
  saveSelectedSpotIds,
  toggleSelectedSpotId,
} from "../data/itineraryStorage";
import { useResizablePanel } from "../hooks/useResizablePanel";
import { useRouteSimulation } from "../hooks/useRouteSimulation";
import type { NavSuggestion } from "../data/navConfirmation";
import {
  isNavConfirm,
  isNavDecline,
  navDeclineReply,
} from "../data/navConfirmation";
import {
  CHAT_LIMITS,
  countWords,
  normalizeUserInput,
  prepareMessagesForLLM,
  validateUserMessage,
} from "@/bot/chatLimits";
import {
  formatPositionMovedNotice,
  shouldInvalidateStaleReply,
  snapshotPosition,
  type PositionSnapshot,
} from "../data/positionChange";
import {
  QUICK_CHIPS,
  VINWONDERS_SPOTS,
  WELCOME_MESSAGE,
  filterSpotsByText,
  type Spot,
} from "../data/spots";
import { parseItineraryFromText, stripItineraryBlock, flagItineraryItems, extractConstraints, type ItineraryItem } from "@/bot/tools";
import ItineraryBoard, { loadSavedItinerary } from "./ItineraryBoard";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  pathType?: string;
  itinerary?: ItineraryItem[];
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  savedAt: number;
}

const STORAGE_ACTIVE = "vinwonders_chat_history";
const STORAGE_HISTORY = "vinwonders_conversations";

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: WELCOME_MESSAGE,
};

function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
const DANGEROUS_ACTIVITIES = [
  "tàu lượn", "thác nước", "cơn thịnh nộ", "zeus", "drop", "mighty",
  "cảm giác mạnh", "mạo hiểm", "độ cao", "lao xuống", "xoay", "quay"
];

function detectWarnings(content: string, messages: Message[]): string[] {
  const allText = messages.map(m => m.content).join(" ").toLowerCase();
  const isElderly = /\b([6-9]\d|1[0-2]\d)\s*tuổi|cụ|ông bà|người già|cao tuổi/.test(allText);
  const isPregnant = /mang thai|bầu/.test(allText);
  const hasHealthIssue = /tim mạch|huyết áp|động kinh/.test(allText);

  if (!isElderly && !isPregnant && !hasHealthIssue) return [];

  const warnings: string[] = [];
  const lower = content.toLowerCase();

  for (const act of DANGEROUS_ACTIVITIES) {
    if (lower.includes(act)) {
      if (isElderly) warnings.push(`⚠️ "${act}" có thể không phù hợp với người cao tuổi`);
      if (isPregnant) warnings.push(`⚠️ "${act}" không phù hợp với phụ nữ mang thai`);
      if (hasHealthIssue) warnings.push(`⚠️ "${act}" cần kiểm tra với bác sĩ trước`);
      break;
    }
  }
  return warnings;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [pendingNavSuggestion, setPendingNavSuggestion] =
    useState<NavSuggestion | null>(null);
  // messageId → editable itinerary items
  const [itineraries, setItineraries] = useState<Record<string, ItineraryItem[]>>({});
  const [positionMovedNotice, setPositionMovedNotice] = useState<string | null>(
    null
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [mapFocusId, setMapFocusId] = useState<string | null>(null);
  const [itinerarySavedNotice, setItinerarySavedNotice] = useState<
    string | null
  >(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width: chatWidth, startDrag } = useResizablePanel({
    defaultWidth: 420,
    minWidth: 300,
    maxWidth: 720,
  });

  const {
    position: userPosition,
    isMoving: isSimulating,
    pickOnMap,
    setPickOnMap,
    pathError: simulationPathError,
    navigationTarget,
    goToLocation,
    goToCoords,
    usePredefinedRoute,
    teleportToLocation,
    previewNavigation,
    cancelNavigation,
    start: startSimulation,
    pause: pauseSimulation,
    resetToStart: resetSimulation,
  } = useRouteSimulation();

  const userPositionRef = useRef(userPosition);
  userPositionRef.current = userPosition;
  const navigationTargetRef = useRef(navigationTarget);
  navigationTargetRef.current = navigationTarget;
  const positionAtLastReplyRef = useRef<PositionSnapshot | null>(null);
  const prevPositionFrameRef = useRef<PositionSnapshot | null>(null);

  function markReplyPosition() {
    positionAtLastReplyRef.current = snapshotPosition(userPositionRef.current);
    setPositionMovedNotice(null);
  }

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
  }, [messages, isLoading, positionMovedNotice]);

  useEffect(() => {
    const prevFrame = prevPositionFrameRef.current;
    const currentFrame = snapshotPosition(userPosition);
    prevPositionFrameRef.current = currentFrame;

    if (
      !shouldInvalidateStaleReply(
        positionAtLastReplyRef.current,
        userPosition,
        prevFrame
      )
    ) {
      return;
    }

    setPendingNavSuggestion(null);
    setPositionMovedNotice(formatPositionMovedNotice(userPosition));

    const nav = navigationTargetRef.current;
    if (nav) {
      previewNavigation(nav.id, nav.name);
    }
  }, [
    userPosition.x,
    userPosition.y,
    userPosition.isMoving,
    userPosition.nearLocationId,
    userPosition.nearLocationName,
    previewNavigation,
  ]);

  useEffect(() => {
    setSelectedIds(loadSelectedSpotIds());
  }, []);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_HISTORY);
      const existing: Conversation[] = savedHistory ? JSON.parse(savedHistory) : [];

      // Move any active session from last visit into history
      const saved = localStorage.getItem(STORAGE_ACTIVE);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        const real = parsed.filter((m) => m.id !== "welcome");
        if (real.length > 0) {
          const firstUser = real.find((m) => m.role === "user");
          const title = firstUser
            ? firstUser.content.slice(0, 48) + (firstUser.content.length > 48 ? "…" : "")
            : "Cuộc trò chuyện";
          const conv: Conversation = {
            id: createId(),
            title,
            messages: parsed,
            savedAt: Date.now(),
          };
          const updated = [conv, ...existing].slice(0, 20);
          localStorage.setItem(STORAGE_HISTORY, JSON.stringify(updated));
          setConversations(updated);
        } else {
          setConversations(existing);
        }
        localStorage.removeItem(STORAGE_ACTIVE);
      } else {
        setConversations(existing);
      }
    } catch {
      // ignore parse/storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE, JSON.stringify(messages));
    } catch {
      // ignore storage errors (e.g. private mode quota)
    }
  }, [messages]);

  function saveConversations(updated: Conversation[]) {
    setConversations(updated);
    try {
      localStorage.setItem(STORAGE_HISTORY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  function saveCurrentChat() {
    const real = messages.filter((m) => m.id !== "welcome");
    if (real.length === 0) return;
    const firstUser = real.find((m) => m.role === "user");
    const title = firstUser
      ? firstUser.content.slice(0, 48) + (firstUser.content.length > 48 ? "…" : "")
      : "Cuộc trò chuyện";
    const conv: Conversation = {
      id: createId(),
      title,
      messages,
      savedAt: Date.now(),
    };
    saveConversations([conv, ...conversations].slice(0, 20));
  }

  function loadConversation(conv: Conversation) {
    setMessages(conv.messages);
    setLastQuery("");
    setInput("");
    setPendingNavSuggestion(null);
    setPositionMovedNotice(null);
    positionAtLastReplyRef.current = null;
    cancelNavigation();
    setHistoryOpen(false);
  }

  function deleteConversation(id: string) {
    saveConversations(conversations.filter((c) => c.id !== id));
  }

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  function handleCancelNavigation() {
    cancelNavigation();
    setPendingNavSuggestion(null);
  }

  function handleShowDirections(id: string, name: string) {
    setPendingNavSuggestion(null);
    previewNavigation(id, name);
  }

  function focusSpotOnMap(spot: Spot) {
    setMapFocusId(spot.id);
    setDiscoveryOpen(true);
  }

  function handleChatShowDirections(spot: Spot) {
    focusSpotOnMap(spot);
    handleShowDirections(spot.id, spot.name);
  }

  function handleCardShowOnMap(entry: ChatCardEntry) {
    focusSpotOnMap(entry.spot);
  }

  function handleCardShowDirections(entry: ChatCardEntry) {
    handleChatShowDirections(entry.spot);
  }

  function handleItinerarySaved(count: number) {
    setItinerarySavedNotice(
      `Đã lưu lịch trình (${count} địa điểm) vào thiết bị`
    );
    window.setTimeout(() => setItinerarySavedNotice(null), 5000);
  }

  function toggleSpot(spot: Spot) {
    const next = toggleSelectedSpotId(spot.id);
    setSelectedIds(next);
  }

  function toggleCardEntry(entry: ChatCardEntry) {
    toggleSpot(entry.spot);
  }

  async function sendMessage(text: string) {
    if (isLoading) return;

    const validation = validateUserMessage(text);
    if (!validation.ok) {
      setInputError(validation.error);
      return;
    }
    const content = validation.content;
    setInputError(null);
    setPositionMovedNotice(null);

    setLastQuery(content);
    setDiscoveryOpen(true);

    if (pendingNavSuggestion && isNavConfirm(content)) {
      const { id, name } = pendingNavSuggestion;
      setPendingNavSuggestion(null);
      setInput("");
      previewNavigation(id, name);
      return;
    }

    const userMsg: Message = {
      id: createId(),
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    if (pendingNavSuggestion) {
      if (isNavDecline(content)) {
        setPendingNavSuggestion(null);
        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            content: navDeclineReply(),
          },
        ]);
        return;
      }

      setPendingNavSuggestion(null);
    }

    const history = prepareMessagesForLLM(
      [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .map(({ role, content }) => ({ role, content }))
    );

    setIsLoading(true);

    const assistantId = createId();

    try {
      const livePosition = userPositionRef.current;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          userPosition: {
            ...livePosition,
            updatedAt: Date.now(),
          },
          lastReplyPosition: positionAtLastReplyRef.current,
          savedItinerary: loadSavedItinerary(),
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

      const contentType = res.headers.get("Content-Type") ?? "";

      if (contentType.includes("application/json")) {
        const data = (await res.json()) as {
          mode?: string;
          content?: string;
          suggestNav?: NavSuggestion | null;
        };
        const content = data.content ?? "";
        setLastQuery(content);
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content },
        ]);
        if (data.mode === "proximity" && data.suggestNav) {
          setPendingNavSuggestion(data.suggestNav);
        } else {
          setPendingNavSuggestion(null);
        }
        markReplyPosition();
        return;
      }

      if (!res.body) throw new Error("Phản hồi không hợp lệ");

      const pathType = res.headers.get("X-Path-Type") ?? undefined;

      setPendingNavSuggestion(null);
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", pathType },
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
          // Strip JSON block from display text while streaming
          const display = parseAssistantContent(stripItineraryBlock(full)).text;
          setLastQuery(display);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: display } : m
            )
          );
        }
      }

      // Parse itinerary from the full (unstripped) response
      const parsed = parseItineraryFromText(full);
      if (parsed) {
        const constraints = extractConstraints(
          [...messages, userMsg, { id: assistantId, role: "assistant" as Role, content: full }]
            .map((m) => ({ role: m.role, content: m.content }))
        );
        const flagged = flagItineraryItems(parsed, constraints);
        setItineraries((prev) => ({ ...prev, [assistantId]: flagged }));
      }

      markReplyPosition();
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
            : chip === "Tôi đang ở đâu?"
              ? "Tôi đang ở gần địa điểm nào nhất trên bản đồ?"
              : chip === "Mạo hiểm gần tôi"
                ? "Tìm cho tôi trò chơi mạo hiểm gần tôi nhất theo đường đi"
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

  function handleInputChange(value: string) {
    setInput(normalizeUserInput(value));
    if (inputError) setInputError(null);
  }

  const inputWordCount = countWords(input);
  const showInputHint =
    inputWordCount >= CHAT_LIMITS.warnUserMessageWords ||
    inputWordCount >= CHAT_LIMITS.maxUserMessageWords - 10;

  function handleSwapActivity(item: ItineraryItem) {
    sendMessage(`Hoạt động "${item.name}" không phù hợp, hãy gợi ý hoạt động thay thế phù hợp hơn`);
  }

  function handleNavConfirm() {
    if (!pendingNavSuggestion || isLoading) return;
    const { id, name } = pendingNavSuggestion;
    setPendingNavSuggestion(null);
    previewNavigation(id, name);
    setDiscoveryOpen(true);
  }

  function handleNavDecline() {
    if (!pendingNavSuggestion || isLoading) return;
    sendMessage("Không");
  }

  function resetChat() {
    saveCurrentChat();
    setMessages([INITIAL_MESSAGE]);
    setItineraries({});
    setSelectedIds(new Set());
    saveSelectedSpotIds(new Set());
    setItinerarySavedNotice(null);
    setLastQuery("");
    setInput("");
    setPendingNavSuggestion(null);
    setPositionMovedNotice(null);
    positionAtLastReplyRef.current = null;
    cancelNavigation();
    try {
      localStorage.removeItem(STORAGE_ACTIVE);
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="flex h-dvh overflow-hidden bg-background"
      style={
        { "--chat-panel-w": `${chatWidth}px` } as CSSProperties
      }
    >
      {/* ── Left: Chat panel — kéo cạnh phải để resize (desktop) ── */}
      <section className="relative flex min-h-0 w-full min-w-0 flex-col bg-surface lg:w-[var(--chat-panel-w)] lg:min-w-[300px] lg:max-w-[50vw] lg:shrink-0">
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
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="text-xs text-muted hover:text-foreground"
              title="Lịch sử trò chuyện"
            >
              <HistoryIcon className="h-4 w-4" />
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

        {/* History drawer */}
        {historyOpen && (
          <div className="absolute inset-0 z-50 flex flex-col bg-surface">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="text-sm font-semibold">Lịch sử trò chuyện</span>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="text-muted hover:text-foreground"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted py-4 text-center">Chưa có lịch sử</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-border px-4 py-3 hover:bg-black/5"
                  >
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => loadConversation(conv)}
                    >
                      <p className="text-sm font-medium leading-snug line-clamp-2">{conv.title}</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {new Date(conv.savedAt).toLocaleString("vi-VN", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                        {" · "}
                        {conv.messages.filter((m) => m.role === "user").length} tin
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteConversation(conv.id)}
                      className="shrink-0 text-muted hover:text-red-500 mt-0.5"
                      aria-label="Xoá"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="scroll-area flex-1 overflow-y-auto px-5">
          <div className="space-y-6 pb-4 pt-2">
            {messages.map((m) => (
              <div key={m.id} className="animate-in">
                {m.role === "assistant" ? (
                  <AssistantMessage
                    messageId={m.id}
                    content={m.content}
                    enableSpotCards={m.id !== "welcome"}
                    selectedIds={selectedIds}
                    warnings={detectWarnings(m.content, messages)}
                    itinerary={itineraries[m.id]}
                    onItineraryChange={(items) =>
                      setItineraries((prev) => ({ ...prev, [m.id]: items }))
                    }
                    onToggleEntry={toggleCardEntry}
                    onShowOnMap={handleCardShowOnMap}
                    onShowDirections={handleCardShowDirections}
                    onItinerarySaved={handleItinerarySaved}
                    onSwapActivity={() =>
                      sendMessage("Hoạt động này không phù hợp, gợi ý trò khác phù hợp hơn")
                    }
                    onSwapItem={handleSwapActivity}
                  />
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

            {itinerarySavedNotice && !isLoading && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-xs font-medium text-green-900">
                {itinerarySavedNotice}
              </div>
            )}

            {positionMovedNotice && !isLoading && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-950">
                <PositionMovedNotice content={positionMovedNotice} />
              </div>
            )}

            {/* Quick chips — ngay dưới tin nhắn bot cuối (Layla behavior) */}
            {!isLoading && pendingNavSuggestion && (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleNavConfirm}
                  className="rounded-full border border-orange-300 bg-orange-50 px-3.5 py-1.5 text-sm font-medium text-orange-900 transition hover:bg-orange-100"
                >
                  Có, chỉ đường
                </button>
                <button
                  type="button"
                  onClick={handleNavDecline}
                  className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-foreground transition hover:border-accent hover:bg-accent/5"
                >
                  Không
                </button>
              </div>
            )}

            {!isLoading && !pendingNavSuggestion && lastAssistant && (
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
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-[#fafafa] px-3 py-2 shadow-sm focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/10">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                aria-invalid={!!inputError}
                aria-describedby="chat-input-hint"
                placeholder="Hỏi ngắn gọn (vd: trạm y tế gần nhất)..."
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
          <div
            id="chat-input-hint"
            className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[10px] text-muted"
          >
            {inputError ? (
              <span className="text-red-600">{inputError}</span>
            ) : showInputHint ? (
              <span className={inputWordCount >= CHAT_LIMITS.maxUserMessageWords ? "text-orange-600" : "text-muted"}>
                {inputWordCount}/{CHAT_LIMITS.maxUserMessageWords} từ
              </span>
            ) : (
              <span>{`Tối đa ${CHAT_LIMITS.maxUserMessageWords} từ · ${CHAT_LIMITS.maxHistoryMessages} tin gần nhất gửi AI`}</span>
            )}
            <span>·</span>
            <span>Thông tin tham khảo · Kiểm tra giá vé chính thức trước khi đi</span>
          </div>
        </footer>
      </section>

      <ResizeHandle onMouseDown={startDrag} />

      {/* ── Right: Discovery panel ── */}
      <div className="hidden min-w-0 flex-1 lg:flex">
        <DiscoveryPanel
          spots={visibleSpots}
          selectedIds={selectedIds}
          onToggleSpot={toggleSpot}
          mobileOpen={discoveryOpen}
          onCloseMobile={() => setDiscoveryOpen(false)}
          userPosition={userPosition}
          isSimulating={isSimulating}
          pathError={simulationPathError}
          navigationTarget={navigationTarget}
          onCancelNavigation={handleCancelNavigation}
          onShowDirections={handleShowDirections}
          pickOnMap={pickOnMap}
          onPickOnMapChange={setPickOnMap}
          onStartSimulation={startSimulation}
          onPauseSimulation={pauseSimulation}
          onResetSimulation={resetSimulation}
          onGoToLocation={goToLocation}
          onGoToCoords={goToCoords}
          onTeleport={teleportToLocation}
          onUseRoute={usePredefinedRoute}
          focusSpotId={mapFocusId}
          onFocusSpot={setMapFocusId}
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
          userPosition={userPosition}
          isSimulating={isSimulating}
          pathError={simulationPathError}
          navigationTarget={navigationTarget}
          onCancelNavigation={handleCancelNavigation}
          onShowDirections={handleShowDirections}
          pickOnMap={pickOnMap}
          onPickOnMapChange={setPickOnMap}
          onStartSimulation={startSimulation}
          onPauseSimulation={pauseSimulation}
          onResetSimulation={resetSimulation}
          onGoToLocation={goToLocation}
          onGoToCoords={goToCoords}
          onTeleport={teleportToLocation}
          onUseRoute={usePredefinedRoute}
          focusSpotId={mapFocusId}
          onFocusSpot={setMapFocusId}
        />
      </div>
    </div>
  );
}

function PositionMovedNotice({ content }: { content: string }) {
  return (
    <div className="chat-markdown">
      <ChatMarkdown content={content} />
    </div>
  );
}

function AssistantMessage({
  messageId,
  content,
  enableSpotCards = true,
  selectedIds,
  warnings,
  itinerary,
  onItineraryChange,
  onToggleEntry,
  onShowOnMap,
  onShowDirections,
  onItinerarySaved,
  onSwapActivity,
  onSwapItem,
}: {
  messageId: string;
  content: string;
  enableSpotCards?: boolean;
  selectedIds: Set<string>;
  warnings?: string[];
  itinerary?: ItineraryItem[];
  onItineraryChange?: (items: ItineraryItem[]) => void;
  onToggleEntry: (entry: ChatCardEntry) => void;
  onShowOnMap: (entry: ChatCardEntry) => void;
  onShowDirections: (entry: ChatCardEntry) => void;
  onItinerarySaved?: (count: number) => void;
  onSwapActivity?: () => void;
  onSwapItem?: (item: ItineraryItem) => void;
}) {
  if (!content) return <TypingIndicator />;

  const { text, cardPayload } = parseAssistantContent(content);
  const entries = enableSpotCards
    ? resolveChatCardEntries(text, cardPayload)
    : [];

  return (
    <div className="space-y-2">
      <div className="chat-markdown">
        <ChatMarkdown content={text} />
      </div>

      {entries.length > 0 && (
        <ChatSpotCards
          entries={entries}
          messageId={messageId}
          selectedIds={selectedIds}
          onToggleSpot={onToggleEntry}
          onShowOnMap={onShowOnMap}
          onShowDirections={onShowDirections}
          onItinerarySaved={onItinerarySaved}
        />
      )}

      {/* Cảnh báo */}
      {warnings && warnings.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-red-700">{w}</p>
          ))}
          {onSwapActivity && (
            <button
              type="button"
              onClick={onSwapActivity}
              className="mt-2 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition"
            >
              Đổi trò khác
            </button>
          )}
        </div>
      )}

      {itinerary && itinerary.length > 0 && onItineraryChange && onSwapItem && (
        <ItineraryBoard
          items={itinerary}
          onChange={onItineraryChange}
          onSwap={onSwapItem}
        />
      )}

      <button
        type="button"
        className="text-muted hover:text-foreground"
        aria-label="Sao chép"
        onClick={() => navigator.clipboard?.writeText(text)}
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

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}
