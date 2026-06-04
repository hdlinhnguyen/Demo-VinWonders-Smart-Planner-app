export const OFFLINE_CHAT_MESSAGE =
  "Bạn đang ngoại tuyến, vui lòng kết nối internet.";

/** Lỗi mạng / không gọi được API — hiển thị câu ngoại tuyến cho user */
const CONNECTIVITY_MESSAGE_PATTERNS = [
  /^failed to fetch$/i,
  /networkerror/i,
  /network request failed/i,
  /load failed/i,
  /không thể kết nối tới (openrouter|openai)/i,
  /econnrefused/i,
  /enotfound/i,
  /etimedout/i,
  /socket hang up/i,
  /fetch failed/i,
  /aborterror/i,
  /err_connection/i,
  /err_internet_disconnected/i,
];

export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

function normalizeErrorText(text: string): string {
  return text.replace(/^⚠️\s*/u, "").trim();
}

export function isConnectivityErrorMessage(message: string): boolean {
  const m = normalizeErrorText(message);
  if (!m) return false;
  return CONNECTIVITY_MESSAGE_PATTERNS.some((re) => re.test(m));
}

export function isNetworkFetchError(err: unknown): boolean {
  if (isBrowserOffline()) return true;
  if (!(err instanceof Error)) return false;

  const msg = err.message.toLowerCase();
  return (
    msg === "failed to fetch" ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    (err.name === "TypeError" && msg.includes("fetch")) ||
    isConnectivityErrorMessage(err.message)
  );
}

/** Chuẩn hóa mọi thông báo lỗi hiển thị trong chat */
export function toUserFacingChatError(message: string): string {
  if (isBrowserOffline() || isConnectivityErrorMessage(message)) {
    return OFFLINE_CHAT_MESSAGE;
  }
  return normalizeErrorText(message);
}

export function getChatNetworkErrorMessage(err: unknown): string | null {
  if (isNetworkFetchError(err)) return OFFLINE_CHAT_MESSAGE;
  if (err instanceof Error && isConnectivityErrorMessage(err.message)) {
    return OFFLINE_CHAT_MESSAGE;
  }
  return null;
}

/** Sau khi stream xong — thay nội dung lỗi kỹ thuật trong bubble assistant */
export function sanitizeAssistantDisplayContent(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;
  if (isConnectivityErrorMessage(trimmed)) return OFFLINE_CHAT_MESSAGE;
  return text;
}
