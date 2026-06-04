import type { Spot } from "./spots";

export const STORAGE_ITINERARY = "vinwonders_itinerary";
export const STORAGE_ITINERARY_SELECTION = "vinwonders_itinerary_selection";

export interface ItineraryItem {
  spotId: string;
  spotName: string;
  scheduleTime?: string;
  zone: string;
  category: string;
  order: number;
}

export interface SavedItinerary {
  id: string;
  title: string;
  items: ItineraryItem[];
  savedAt: number;
  sourceMessageId?: string;
}

function spotToItineraryItem(
  spot: Spot,
  scheduleTime: string | undefined,
  order: number
): ItineraryItem {
  return {
    spotId: spot.id,
    spotName: spot.name,
    scheduleTime,
    zone: spot.location,
    category: spot.category,
    order,
  };
}

export function loadItinerary(): SavedItinerary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_ITINERARY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedItinerary;
    if (!parsed?.items || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveItinerary(
  items: ItineraryItem[],
  opts?: { title?: string; sourceMessageId?: string }
): SavedItinerary {
  const itinerary: SavedItinerary = {
    id: `it-${Date.now()}`,
    title: opts?.title ?? `Lịch trình ${new Date().toLocaleDateString("vi-VN")}`,
    items,
    savedAt: Date.now(),
    sourceMessageId: opts?.sourceMessageId,
  };
  try {
    localStorage.setItem(STORAGE_ITINERARY, JSON.stringify(itinerary));
  } catch {
    /* quota / private mode */
  }
  return itinerary;
}

export function saveItineraryFromCards(
  entries: { spot: Spot; scheduleTime?: string }[],
  sourceMessageId?: string
): SavedItinerary | null {
  if (entries.length === 0) return null;
  const items = entries.map((e, i) =>
    spotToItineraryItem(e.spot, e.scheduleTime, i)
  );
  return saveItinerary(items, {
    title:
      entries.length >= 2
        ? `Lịch trình ${entries.length} địa điểm`
        : `Gợi ý: ${entries[0].spot.name}`,
    sourceMessageId,
  });
}

export function loadSelectedSpotIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_ITINERARY_SELECTION);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as unknown;
    if (!Array.isArray(ids)) return new Set();
    return new Set(ids.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function saveSelectedSpotIds(ids: Set<string>): void {
  try {
    localStorage.setItem(
      STORAGE_ITINERARY_SELECTION,
      JSON.stringify([...ids])
    );
  } catch {
    /* ignore */
  }
}

export function toggleSelectedSpotId(spotId: string): Set<string> {
  const next = loadSelectedSpotIds();
  if (next.has(spotId)) next.delete(spotId);
  else next.add(spotId);
  saveSelectedSpotIds(next);
  return next;
}
