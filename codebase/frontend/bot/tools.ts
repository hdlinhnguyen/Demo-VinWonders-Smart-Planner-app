import type { ChatMessage, PathType } from "./types";

export interface TripConstraints {
  groupSize: number | null;
  hasKids: boolean;
  kidsAge: number | null;
  kidsHeight: number | null;
  hasElderly: boolean;
  healthIssues: string[];
  thrillWanted: boolean;
  arrivalTime: string | null;
  departureTime: string | null;
  preferences: string[];
}

export interface ItineraryItem {
  id: string;
  time: string;
  name: string;
  reason: string;
  durationMinutes: number;
  warning: string | null;
}

const THRILL_KEYWORDS = [
  "tàu lượn", "thác nước", "cơn thịnh nộ", "zeus", "drop", "mighty",
  "cảm giác mạnh", "mạo hiểm", "độ cao", "lao xuống", "xoay tròn",
];

export function extractConstraints(messages: ChatMessage[]): TripConstraints {
  const fullText = messages.map(m => m.content).join(" ").toLowerCase();

  const groupMatch = fullText.match(/(\d+)\s*người/);
  const groupSize = groupMatch ? parseInt(groupMatch[1]) : null;

  const hasKids = /trẻ nhỏ|trẻ em|em bé|con nhỏ|\bbé\b/.test(fullText);
  const kidsAgeMatch = fullText.match(/(\d{1,2})\s*tuổi/);
  const kidsAge = kidsAgeMatch ? parseInt(kidsAgeMatch[1]) : null;
  const kidsHeightMatch = fullText.match(/(\d{2,3})\s*cm/);
  const kidsHeight = kidsHeightMatch ? parseInt(kidsHeightMatch[1]) : null;

  const hasElderly = /ông bà|người già|cao tuổi|\bcụ\b/.test(fullText);

  const healthIssues: string[] = [];
  if (/tim mạch/.test(fullText)) healthIssues.push("tim mạch");
  if (/huyết áp/.test(fullText)) healthIssues.push("huyết áp");
  if (/mang thai|bầu/.test(fullText)) healthIssues.push("mang thai");
  if (/động kinh/.test(fullText)) healthIssues.push("động kinh");

  const thrillWanted = /cảm giác mạnh|mạo hiểm/.test(fullText);

  const arrivalMatch = fullText.match(/(?:vào|từ|lúc)\s*(\d{1,2})[h:]\s*(\d{0,2})/);
  const arrivalTime = arrivalMatch
    ? `${arrivalMatch[1].padStart(2, "0")}:${(arrivalMatch[2] || "00").padStart(2, "0")}`
    : null;

  const departureMatch = fullText.match(/(?:đến|tới|kết thúc|về|ra)\s*(\d{1,2})[h:]\s*(\d{0,2})/);
  const departureTime = departureMatch
    ? `${departureMatch[1].padStart(2, "0")}:${(departureMatch[2] || "00").padStart(2, "0")}`
    : null;

  const preferences: string[] = [];
  if (/\bshow\b|biểu diễn/.test(fullText)) preferences.push("show");
  if (/thủy cung/.test(fullText)) preferences.push("thủy cung");
  if (/ăn uống|nhà hàng/.test(fullText)) preferences.push("ăn uống");
  if (/nhẹ nhàng|trò nhẹ/.test(fullText)) preferences.push("nhẹ nhàng");

  return {
    groupSize, hasKids, kidsAge, kidsHeight, hasElderly,
    healthIssues, thrillWanted, arrivalTime, departureTime, preferences,
  };
}

export function checkConstraintCompleteness(c: TripConstraints): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!c.groupSize && !c.hasKids && !c.hasElderly) missing.push("số người trong nhóm");
  if (c.hasKids && !c.kidsAge) missing.push("độ tuổi của trẻ");
  if (c.thrillWanted && c.healthIssues.length === 0) missing.push("tình trạng sức khỏe");
  // Arrival time is optional — AI will assume a full day (09:00–20:00) if not given
  return { ok: missing.length === 0, missing };
}

export function detectPath(messages: ChatMessage[]): PathType {
  if (messages.length === 0) return "general";

  const lastUser = [...messages].reverse().find(m => m.role === "user")?.content.toLowerCase() ?? "";

  // Failure: user marks an activity as not suitable
  if (/không phù hợp|không chơi được|đổi trò|cần thay|không được chơi|thay (trò|hoạt động)/.test(lastUser)) {
    return "failure";
  }

  // Correction: itinerary already exists and user wants to change it
  const hasPriorItinerary = messages.some(
    m => m.role === "assistant" && /\d{1,2}:\d{2}\s*[:–\-—]/.test(m.content)
  );
  if (
    hasPriorItinerary &&
    /bỏ|đổi|thay|sửa|không muốn|ưu tiên|loại bỏ|thêm|giảm|cập nhật lịch|đổi lịch/.test(lastUser)
  ) {
    return "correction";
  }

  // Chỉ tin **câu user hiện tại** — tránh ép JSON vì đã hỏi lịch trình từ trước
  const wantsItinerary =
    /lịch trình|lên kế hoạch|lên lịch|đi chơi cả ngày|tham quan cả ngày|chơi từ|lịch.*ngày|kế hoạch.*ngày/.test(
      lastUser
    ) ||
    (hasPriorItinerary &&
      /cập nhật lịch|đổi lịch|chỉnh lịch|sửa lịch|thêm.*lịch/.test(lastUser));

  if (!wantsItinerary) return "general";

  const constraints = extractConstraints(messages);
  const { ok } = checkConstraintCompleteness(constraints);
  return ok ? "happy" : "low-confidence";
}

export function flagItineraryItems(
  items: ItineraryItem[],
  constraints: TripConstraints
): ItineraryItem[] {
  return items.map(item => {
    const text = (item.name + " " + item.reason).toLowerCase();
    const isThrill = THRILL_KEYWORDS.some(k => text.includes(k));
    if (!isThrill) return item;

    let warning: string | null = null;
    if (constraints.hasKids && constraints.kidsAge !== null && constraints.kidsAge < 10) {
      warning = `Có thể không phù hợp với trẻ ${constraints.kidsAge} tuổi — kiểm tra điều kiện chiều cao tại quầy`;
    } else if (constraints.hasElderly) {
      warning = "Cần thận trọng với người cao tuổi — hỏi nhân viên trước khi tham gia";
    } else if (constraints.healthIssues.length > 0) {
      warning = `Không khuyến nghị cho người có ${constraints.healthIssues.join(", ")}`;
    }

    return { ...item, warning };
  });
}

let _idCounter = 0;
export function makeItemId() {
  return `item-${++_idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

interface RawItem {
  time?: unknown;
  name?: unknown;
  reason?: unknown;
  durationMinutes?: unknown;
}

/** Extracts the ```json [...] ``` block the LLM appends and returns parsed items.
 *  Falls back to line-by-line text parsing if no JSON block is found. */
export function parseItineraryFromText(text: string): ItineraryItem[] | null {
  // ── Primary: JSON block ───────────────────────────────────
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    let raw: unknown;
    try { raw = JSON.parse(jsonMatch[1].trim()); } catch { /* fall through */ }
    if (Array.isArray(raw) && raw.length >= 2) {
      const items: ItineraryItem[] = (raw as RawItem[])
        .filter(r => typeof r.time === "string" && typeof r.name === "string")
        .map(r => ({
          id: makeItemId(),
          time: String(r.time).padStart(5, "0"),
          name: String(r.name).trim(),
          reason: typeof r.reason === "string" ? r.reason.trim() : "",
          durationMinutes: typeof r.durationMinutes === "number" ? r.durationMinutes : 45,
          warning: null,
        }));
      if (items.length >= 2) return items;
    }
  }

  // ── Fallback: parse time-prefixed lines from free text ────
  // Handles patterns the model commonly produces:
  //   9:00 - 10:00: Heading text        (time range heading — skip)
  //   9:00: Name (reason)
  //   9:00 – Name – reason
  //   • **Name**: reason
  //   - **Huyền thoại Maya**: reason
  const items: ItineraryItem[] = [];
  let currentTime = "09:00";

  for (const raw of text.split("\n")) {
    const line = raw.replace(/\*\*/g, "").trim();
    if (!line) continue;

    // Time range heading like "9:00 - 10:00: Khu ..." — extract time, treat rest as name
    const rangeMatch = line.match(/^(\d{1,2}:\d{2})\s*[-–—]\s*\d{1,2}:\d{2}\s*[:：]\s*(.+)$/);
    if (rangeMatch) {
      const [, t, name] = rangeMatch;
      currentTime = t.padStart(5, "0");
      // collect following bullet lines as children of this heading
      items.push({ id: makeItemId(), time: currentTime, name: name.trim(), reason: "", durationMinutes: 60, warning: null });
      continue;
    }

    // Plain time prefix "9:00: Name" or "9:00 – Name – reason"
    const timeMatch = line.match(/^(\d{1,2}:\d{2})\s*[:：–\-—]\s*(.+?)(?:\s*[–\-—]\s*(.+))?$/);
    if (timeMatch) {
      const [, t, name, reason] = timeMatch;
      currentTime = t.padStart(5, "0");
      items.push({
        id: makeItemId(),
        time: currentTime,
        name: name.trim(),
        reason: (reason ?? "").trim(),
        durationMinutes: 45,
        warning: null,
      });
      continue;
    }

    // Bullet "- Name: reason" or "• Name: reason" under a time heading
    const bulletMatch = line.match(/^[-•*]\s+(.+?)(?:[：:]\s*(.+))?$/);
    if (bulletMatch && items.length > 0) {
      const [, name, reason] = bulletMatch;
      items.push({
        id: makeItemId(),
        time: currentTime,
        name: name.trim(),
        reason: (reason ?? "").trim(),
        durationMinutes: 45,
        warning: null,
      });
    }
  }

  // Deduplicate items at the same time with very similar names
  const seen = new Set<string>();
  const deduped = items.filter(it => {
    const key = `${it.time}|${it.name.slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.length >= 3 ? deduped : null;
}

/** Returns the display text with the ```json block stripped out. */
export function stripItineraryBlock(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, "").trimEnd();
}
