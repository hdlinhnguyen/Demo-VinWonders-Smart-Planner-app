import { ALL_LOCATIONS, LOCATION_TYPES } from "./locations";

const PARK_TYPES = [
  ...new Set(ALL_LOCATIONS.map((l) => l.type)),
] as readonly string[];

export type ProximityIntent =
  | "nearest_overall"
  | `nearest_${(typeof PARK_TYPES)[number]}`;

const PROXIMITY_TRIGGER =
  /ở gần|o gan|gần nhất|gan nhat|gần tôi|gan toi|đang ở|dang o|ở đâu|o dau|vị trí|vi tri|chấm xanh|cham xanh|định vị|dinh vi|chỉ đường|chi duong|dẫn đường|dan duong|đường đi|duong di|near me|where am i/i;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Khớp cụm từ tại ranh giới — tránh "uong" khớp trong "duong", "an" trong "anh"... */
function textContainsKeyword(text: string, keyword: string): boolean {
  if (keyword.length < 2) return false;
  const padded = ` ${text} `;
  const kw = escapeRegex(keyword.trim());
  const re = new RegExp(`(?:^|[\\s,.!?;:/\\-])${kw}(?:$|[\\s,.!?;:/\\-])`);
  return re.test(padded);
}

function keywordsForType(type: string): string[] {
  const set = new Set<string>();
  const typeDef = LOCATION_TYPES[type];

  for (const loc of ALL_LOCATIONS) {
    if (loc.type !== type) continue;
    set.add(normalize(loc.typeLabel));
    for (const term of loc.searchTerms ?? []) {
      set.add(normalize(term));
    }
    for (const h of loc.highlights) {
      set.add(normalize(h));
    }
  }

  if (typeDef) {
    for (const kw of typeDef.chatKeywords) set.add(normalize(kw));
    for (const kw of typeDef.userPhrases) set.add(normalize(kw));
  }

  return [...set].filter((k) => k.length >= 2).sort((a, b) => b.length - a.length);
}

const TYPE_KEYWORD_LIST = PARK_TYPES.map((type) => ({
  type,
  keywords: keywordsForType(type),
}));

/** Loại địa điểm khớp nhất trong câu (keyword dài nhất thắng) */
export function matchLocationTypeInText(text: string): string | null {
  const t = normalize(text);
  let best: { type: string; len: number } | null = null;

  for (const { type, keywords } of TYPE_KEYWORD_LIST) {
    for (const kw of keywords) {
      if (textContainsKeyword(t, kw) && (!best || kw.length > best.len)) {
        best = { type, len: kw.length };
      }
    }
  }

  return best?.type ?? null;
}

/** Nhận diện câu hỏi cần trả lời xác định từ mock_data + tọa độ chấm xanh */
export function detectProximityIntent(text: string): ProximityIntent | null {
  const t = normalize(text);
  if (!t) return null;

  const matchedType = matchLocationTypeInText(text);
  const hasProximityCue = PROXIMITY_TRIGGER.test(t);

  if (matchedType && hasProximityCue) {
    return `nearest_${matchedType}` as ProximityIntent;
  }

  if (hasProximityCue) {
    return "nearest_overall";
  }

  return null;
}

export function intentToLocationType(intent: ProximityIntent): string | null {
  if (intent === "nearest_overall") return null;
  return intent.slice("nearest_".length);
}

export function intentToTypeLabel(intent: ProximityIntent): string {
  const type = intentToLocationType(intent);
  if (!type) return "địa điểm";
  const fromCatalog = LOCATION_TYPES[type]?.typeLabel;
  if (fromCatalog) return fromCatalog.toLowerCase();
  const sample = ALL_LOCATIONS.find((l) => l.type === type);
  return sample?.typeLabel.toLowerCase() ?? type;
}
