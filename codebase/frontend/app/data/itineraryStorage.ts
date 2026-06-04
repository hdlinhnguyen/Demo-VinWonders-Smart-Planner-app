import type { ItineraryItem as BotItineraryItem } from "@/bot/tools";
import { ALL_LOCATIONS, getLocationById, locationToSpot } from "./locations";
import type { Spot } from "./spots";

export const STORAGE_ITINERARY = "vinwonders_itinerary";
export const STORAGE_ITINERARY_SELECTION = "vinwonders_itinerary_selection";
export const STORAGE_BOARD_ITINERARY = "vinwonders_saved_itinerary";

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
  const saved = saveItinerary(items, {
    title:
      entries.length >= 2
        ? `Lịch trình ${entries.length} địa điểm`
        : `Gợi ý: ${entries[0].spot.name}`,
    sourceMessageId,
  });
  const sel = loadSelectedSpotIds();
  for (const e of entries) sel.add(e.spot.id);
  saveSelectedSpotIds(sel);
  return saved;
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

/** Gỡ một địa điểm khỏi mọi storage Agent đọc (lịch card + board) */
export function removeSpotFromPersistedItinerary(spotId: string): void {
  const card = loadItinerary();
  if (card?.items) {
    const filtered = card.items.filter((it) => it.spotId !== spotId);
    if (filtered.length === 0) {
      try {
        localStorage.removeItem(STORAGE_ITINERARY);
      } catch {
        /* ignore */
      }
    } else {
      saveItinerary(
        filtered.map((it, i) => ({ ...it, order: i })),
        { title: card.title, sourceMessageId: card.sourceMessageId }
      );
    }
  }

  const board = loadBoardItinerary();
  if (board) {
    const filtered = board.filter((it) => {
      const loc =
        getLocationById(it.id) ??
        ALL_LOCATIONS.find((l) => l.name === it.name);
      return loc?.id !== spotId;
    });
    try {
      if (filtered.length === 0) {
        localStorage.removeItem(STORAGE_BOARD_ITINERARY);
      } else {
        localStorage.setItem(
          STORAGE_BOARD_ITINERARY,
          JSON.stringify(filtered)
        );
      }
    } catch {
      /* ignore */
    }
  }
}

function syncSpotIntoCardItinerary(spot: Spot): void {
  const card = loadItinerary();
  const items = card?.items ?? [];
  if (items.some((it) => it.spotId === spot.id)) return;
  const next = [...items, spotToItineraryItem(spot, undefined, items.length)];
  saveItinerary(next, {
    title:
      card?.title ??
      (next.length >= 2
        ? `Đã chọn ${next.length} địa điểm`
        : `Gợi ý: ${spot.name}`),
    sourceMessageId: card?.sourceMessageId,
  });
}

export function toggleSelectedSpotId(spotId: string): Set<string> {
  const next = loadSelectedSpotIds();
  const removing = next.has(spotId);
  if (removing) next.delete(spotId);
  else next.add(spotId);
  saveSelectedSpotIds(next);

  const loc = getLocationById(spotId);
  if (loc) {
    if (removing) {
      removeSpotFromPersistedItinerary(spotId);
    } else {
      syncSpotIntoCardItinerary(locationToSpot(loc));
    }
  }
  return next;
}

function scheduleToTime(scheduleTime?: string): string {
  if (!scheduleTime) return "09:00";
  const m = scheduleTime.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : "09:00";
}

function loadBoardItinerary(): BotItineraryItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_BOARD_ITINERARY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as BotItineraryItem[];
  } catch {
    return null;
  }
}

/** Mọi spot id user đã + Chọn hoặc đã lưu lịch trình — không gợi ý lại */
export function getExcludedSpotIds(): Set<string> {
  const ids = loadSelectedSpotIds();
  const saved = loadItinerary();
  if (saved?.items) {
    for (const it of saved.items) ids.add(it.spotId);
  }
  const board = loadBoardItinerary();
  if (board) {
    for (const it of board) {
      const loc =
        getLocationById(it.id) ??
        ALL_LOCATIONS.find((l) => l.name === it.name);
      if (loc) ids.add(loc.id);
    }
  }
  return ids;
}

function resolveBoardLocationId(it: BotItineraryItem): string | null {
  const byId = getLocationById(it.id);
  if (byId) return byId.id;
  const byName = ALL_LOCATIONS.find((l) => l.name === it.name);
  return byName?.id ?? null;
}

/** Gửi lên /api/chat — chỉ địa điểm còn trong + Chọn (đã sync storage) */
export function buildSavedItineraryForApi(): BotItineraryItem[] | null {
  const selected = loadSelectedSpotIds();
  const merged: BotItineraryItem[] = [];
  const seenNames = new Set<string>();

  const pushItem = (item: BotItineraryItem) => {
    if (seenNames.has(item.name)) return;
    seenNames.add(item.name);
    merged.push(item);
  };

  const card = loadItinerary();
  if (card?.items) {
    for (const it of card.items) {
      if (!selected.has(it.spotId)) continue;
      pushItem({
        id: it.spotId,
        time: scheduleToTime(it.scheduleTime),
        name: it.spotName,
        reason: `Đã chọn · ${it.category}`,
        durationMinutes: 30,
        warning: null,
      });
    }
  }

  const board = loadBoardItinerary();
  if (board) {
    for (const it of board) {
      const locId = resolveBoardLocationId(it);
      if (!locId || !selected.has(locId)) continue;
      pushItem(it);
    }
  }

  for (const spotId of selected) {
    const loc = getLocationById(spotId);
    if (!loc || seenNames.has(loc.name)) continue;
    pushItem({
      id: loc.id,
      time: scheduleToTime(
        card?.items.find((i) => i.spotId === spotId)?.scheduleTime
      ),
      name: loc.name,
      reason: "User đã chọn (+ Chọn)",
      durationMinutes: 30,
      warning: null,
    });
  }

  return merged.length > 0 ? merged : null;
}
