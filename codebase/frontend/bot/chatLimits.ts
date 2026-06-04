import type { ChatMessage } from "./types";

/** Giới hạn mặc định — có thể ghi đè bằng biến môi trường (số nguyên dương) */
export const CHAT_LIMITS = {
  maxUserMessageWords: readLimit("CHAT_MAX_USER_WORDS", 200),
  maxHistoryMessages: readLimit("CHAT_MAX_HISTORY_MESSAGES", 10),
  maxAssistantHistoryChars: readLimit("CHAT_MAX_ASSISTANT_HISTORY_CHARS", 600),
  warnUserMessageWords: readLimit("CHAT_WARN_USER_WORDS", 170),
} as const;

function readLimit(envKey: string, fallback: number): number {
  const raw = process.env[envKey]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Đếm từ theo khoảng trắng (đủ dùng cho tiếng Việt) */
export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/** Chỉ bỏ ký tự vô hình — không trim/cắt (giữ phím cách khi đang gõ) */
export function normalizeUserInput(text: string): string {
  return text.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\r\n/g, "\n");
}

/** Chuẩn hóa trước khi gửi: gom khoảng trắng thừa, trim đầu/cuối */
export function sanitizeUserMessageForSend(text: string): string {
  let t = normalizeUserInput(text);
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

export type ValidateResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

export function validateUserMessage(text: string): ValidateResult {
  const content = sanitizeUserMessageForSend(text);
  if (!content) {
    return { ok: false, error: "Vui lòng nhập câu hỏi." };
  }
  const words = countWords(content);
  if (words > CHAT_LIMITS.maxUserMessageWords) {
    return {
      ok: false,
      error: `Tin nhắn tối đa ${CHAT_LIMITS.maxUserMessageWords} từ (hiện ${words}). Hãy tóm tắt câu hỏi.`,
    };
  }
  return { ok: true, content };
}

function truncateAssistantHistory(content: string): string {
  const max = CHAT_LIMITS.maxAssistantHistoryChars;
  if (content.length <= max) return content;
  return `${content.slice(0, max)}… [đã rút gọn để tiết kiệm token]`;
}

/**
 * Giảm token gửi lên LLM: giữ N tin gần nhất, rút gọn assistant cũ.
 */
export function prepareMessagesForLLM(messages: ChatMessage[]): ChatMessage[] {
  const normalized = messages.map((m, i) => {
    if (m.role === "user") {
      const v = validateUserMessage(m.content);
      return {
        role: m.role,
        content: v.ok ? v.content : sanitizeUserMessageForSend(m.content),
      };
    }
    const isLast = i === messages.length - 1;
    const isSecondLast =
      messages.length >= 2 &&
      i === messages.length - 2 &&
      messages[i + 1]?.role === "user";
    if (isLast || isSecondLast) return m;
    return {
      ...m,
      content: truncateAssistantHistory(m.content),
    };
  });

  const max = CHAT_LIMITS.maxHistoryMessages;
  if (normalized.length <= max) return normalized;
  return normalized.slice(-max);
}
