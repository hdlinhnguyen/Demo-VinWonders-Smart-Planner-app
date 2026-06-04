import { ALL_LOCATIONS, getLocationById } from "@/app/data/locations";
import type { ItineraryItem } from "./tools";

export interface ResolvedSavedSpot {
  id: string;
  name: string;
  time: string;
  timeLabel: string;
  reason: string;
  durationMinutes: number;
}

/** User muốn xem / nhắc lại lịch trình đã lưu hoặc đã + Chọn */
export function detectSavedItineraryQuery(text: string): boolean {
  const t = text.toLowerCase().normalize("NFC");
  return (
    /đã\s*(lưu|chọn)/.test(t) ||
    /lịch\s*trình\s*(đã|của\s*tôi|hiện\s*tại)/.test(t) ||
    /xem\s*(lịch|gợi\s*ý|danh\s*sách)/.test(t) ||
    /những\s*(địa\s*điểm|chỗ|nơi)\s*đã/.test(t) ||
    /theo\s*(lịch|danh\s*sách)\s*đã/.test(t) ||
    /gợi\s*ý\s*đã/.test(t) ||
    /địa\s*điểm\s*đã\s*chọn/.test(t)
  );
}

/** User muốn lịch trình mới / thêm chỗ khác — không ép chỉ danh sách đã lưu */
export function detectNewItineraryRequest(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /lịch\s*trình\s*mới/.test(t) ||
    /lên\s*(lịch|kế\s*hoạch)/.test(t) ||
    /gợi\s*ý\s*thêm/.test(t) ||
    /thêm\s*(địa\s*điểm|chỗ|hoạt\s*động)/.test(t) ||
    /chỗ\s*khác/.test(t) ||
    /đi\s*chơi\s*cả\s*ngày/.test(t)
  );
}

function padTime(t: string): string {
  const [h, m] = t.split(":");
  return `${h.padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}`;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function buildTimeLabel(time: string, durationMinutes: number): string {
  const start = padTime(time);
  const end = addMinutes(start, durationMinutes);
  return `${start} – ${end}`;
}

export function resolveSavedItineraryItems(
  items: ItineraryItem[]
): ResolvedSavedSpot[] {
  const resolved: ResolvedSavedSpot[] = [];
  const seen = new Set<string>();

  for (const it of items) {
    const loc =
      getLocationById(it.id) ??
      ALL_LOCATIONS.find((l) => l.name === it.name);
    if (!loc || seen.has(loc.id)) continue;
    seen.add(loc.id);

    const duration =
      typeof it.durationMinutes === "number" && it.durationMinutes > 0
        ? it.durationMinutes
        : 30;

    resolved.push({
      id: loc.id,
      name: loc.name,
      time: padTime(it.time),
      timeLabel: buildTimeLabel(it.time, duration),
      reason: it.reason?.trim() || "Đã lưu trong app",
      durationMinutes: duration,
    });
  }

  return resolved;
}

export function buildCardsMarker(spots: ResolvedSavedSpot[]): string {
  if (spots.length === 0) return "";
  const payload = spots.map((s) => ({ id: s.id, time: s.timeLabel }));
  return `\n<<<CARDS:${JSON.stringify(payload)}>>>`;
}

/** Context cho system message — Agent phải khớp id đã lưu */
export function buildSavedItineraryAgentContext(
  items: ItineraryItem[]
): string | undefined {
  const spots = resolveSavedItineraryItems(items);
  if (spots.length === 0) return undefined;

  const lines = spots.map(
    (s, i) =>
      `${i + 1}. **${s.name}** — id: \`${s.id}\` · ${s.timeLabel}${s.reason ? ` — ${s.reason}` : ""}`
  );

  const cardsMarker = buildCardsMarker(spots);

  return [
    "## Lịch trình / địa điểm user ĐÃ LƯU (localStorage — nguồn chính xác duy nhất)",
    lines.join("\n"),
    "",
    "**Quy tắc Agent (bắt buộc):**",
    "- Khi user hỏi về lịch trình đã lưu / đã chọn: **chỉ** dùng đúng tên và **id** ở trên; không đổi tên, không bịa địa điểm.",
    "- Dòng <<<CARDS>>> cuối câu trả lời **phải khớp chính xác** (cùng id, cùng thứ tự, time khớp khung giờ):",
    cardsMarker.trim(),
    "- **Không** thêm id khác vào <<<CARDS>>> khi user chỉ xem/xác nhận danh sách đã lưu.",
    "- Khi user yêu cầu lịch trình **mới** hoặc **thêm** gợi ý: có thể đề xuất thêm địa điểm, nhưng mỗi id trong <<<CARDS>>> phải có tên tương ứng trong phần văn bản.",
  ].join("\n");
}

/** Trả lời xác định (không qua LLM) khi user hỏi lại danh sách đã lưu */
export function buildDeterministicSavedItineraryReply(
  items: ItineraryItem[]
): string | null {
  const spots = resolveSavedItineraryItems(items);
  if (spots.length === 0) return null;

  const intro =
    spots.length === 1
      ? "Đây là **1** địa điểm bạn đã lưu/chọn trong app:\n\n"
      : `Đây là **${spots.length}** địa điểm bạn đã lưu/chọn trong app:\n\n`;

  const body = spots
    .map((s) => `- ${s.timeLabel} – **${s.name}** — ${s.reason}`)
    .join("\n");

  const footer =
    "\n\nBạn có thể bấm **Chỉ đường** trên từng card hoặc hỏi *“thêm gợi ý”* / *“lịch trình mới”* nếu muốn bổ sung chỗ khác.";

  return intro + body + footer + buildCardsMarker(spots);
}

/** Gắn vào tin user cuối khi có dữ liệu đã lưu (nhắc LLM khớp CARDS) */
export function buildSavedItineraryUserAugment(
  items: ItineraryItem[],
  userQuery: string
): string | undefined {
  if (items.length === 0) return undefined;
  if (detectNewItineraryRequest(userQuery)) return undefined;

  const spots = resolveSavedItineraryItems(items);
  if (spots.length === 0) return undefined;

  const ids = spots.map((s) => s.id).join(", ");
  const cardsMarker = buildCardsMarker(spots);

  if (detectSavedItineraryQuery(userQuery)) {
    return `\n\n[AGENT — user hỏi lịch trình đã lưu: <<<CARDS>>> BẮT BUỘC đúng như sau, không thêm id khác: ${cardsMarker.trim()}]`;
  }

  return `\n\n[AGENT — User đã lưu ${spots.length} địa điểm (id: ${ids}). Nếu câu trả lời liệt kê các mục này, <<<CARDS>>> phải dùng đúng các id đó theo thứ tự; không thêm địa điểm lạ vào CARDS.]`;
}
