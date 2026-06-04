import {
  ALL_LOCATIONS,
  getLocationById,
  locationToSpot,
  type Spot,
} from "./locations";

/** Marker ẩn do LLM thêm cuối câu trả lời — UI sẽ strip và render card */
export const CHAT_CARDS_MARKER = "<<<CARDS:";
export const CHAT_CARDS_END = ">>>";

const CARDS_BLOCK_RE = /<<<CARDS:\s*(\[[\s\S]*?\])\s*>>>/;
const CARDS_PARTIAL_RE = /<<<CARDS:[\s\S]*$/;

const TIME_RANGE_RE =
  /(\d{1,2}:\d{2}\s*[–\-—]\s*\d{1,2}:\d{2}|\d{1,2}:\d{2})/;

export interface ChatCardEntry {
  spot: Spot;
  scheduleTime?: string;
}

interface CardPayloadItem {
  id: string;
  time?: string;
}

function normalizeTime(raw: string): string {
  return raw.replace(/\s*[–\-—]\s*/g, " – ").trim();
}

function parseCardsPayload(raw: string): CardPayloadItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const items: CardPayloadItem[] = [];
    for (const entry of parsed) {
      if (typeof entry === "string") {
        items.push({ id: entry });
      } else if (entry && typeof entry === "object" && "id" in entry) {
        const o = entry as { id?: unknown; time?: unknown };
        if (typeof o.id === "string") {
          items.push({
            id: o.id,
            time: typeof o.time === "string" ? normalizeTime(o.time) : undefined,
          });
        }
      }
    }
    return items;
  } catch {
    return [];
  }
}

/** Tìm khung giờ trên dòng có tên địa điểm (lịch trình HH:MM – Tên) */
export function extractScheduleTimeForLocation(
  text: string,
  locationName: string
): string | undefined {
  const lines = text.split("\n");
  for (const line of lines) {
    if (!line.includes(locationName)) continue;

    const rangeMatch = line.match(
      /(\d{1,2}:\d{2}\s*[–\-—]\s*\d{1,2}:\d{2})/
    );
    if (rangeMatch) return normalizeTime(rangeMatch[1]);

    const startMatch = line.match(
      /^[\s*\-•\d.]*(\d{1,2}:\d{2})\s*[–\-—]/
    );
    if (startMatch) return startMatch[1];
  }
  return undefined;
}

export function parseAssistantContent(raw: string): {
  text: string;
  cardPayload: CardPayloadItem[];
} {
  const match = raw.match(CARDS_BLOCK_RE);
  let cardPayload: CardPayloadItem[] = [];
  let text = raw;

  if (match) {
    cardPayload = parseCardsPayload(match[1]);
    text = raw.replace(CARDS_BLOCK_RE, "").trim();
  }

  text = text.replace(CARDS_PARTIAL_RE, "").trim();
  return { text, cardPayload };
}

/** Gắn spot + giờ từ marker LLM hoặc khớp tên trong nội dung */
export function resolveChatCardEntries(
  text: string,
  cardPayload: CardPayloadItem[] = []
): ChatCardEntry[] {
  const seen = new Set<string>();
  const entries: ChatCardEntry[] = [];

  for (const item of cardPayload) {
    const loc = getLocationById(item.id);
    if (!loc || seen.has(item.id)) continue;
    seen.add(item.id);
    const spot = locationToSpot(loc);
    const scheduleTime =
      item.time ?? extractScheduleTimeForLocation(text, loc.name);
    entries.push({ spot, scheduleTime });
  }

  if (entries.length > 0) return entries.slice(0, 8);

  const sorted = [...ALL_LOCATIONS].sort(
    (a, b) => b.name.length - a.name.length
  );
  for (const loc of sorted) {
    if (text.includes(loc.name) && !seen.has(loc.id)) {
      seen.add(loc.id);
      entries.push({
        spot: locationToSpot(loc),
        scheduleTime: extractScheduleTimeForLocation(text, loc.name),
      });
    }
  }

  return entries.slice(0, 8);
}

/** @deprecated dùng resolveChatCardEntries */
export function resolveSpotsForChat(
  text: string,
  explicitIds: string[] = []
): Spot[] {
  const payload = explicitIds.map((id) => ({ id }));
  return resolveChatCardEntries(text, payload).map((e) => e.spot);
}
