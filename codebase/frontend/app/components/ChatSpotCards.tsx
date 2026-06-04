"use client";

import { useEffect, useRef } from "react";
import type { ChatCardEntry } from "../data/chatCards";
import { saveItineraryFromCards } from "../data/itineraryStorage";
import ChatSpotCardCompact from "./ChatSpotCardCompact";

interface ChatSpotCardsProps {
  entries: ChatCardEntry[];
  messageId: string;
  selectedIds: Set<string>;
  onToggleSpot: (entry: ChatCardEntry) => void;
  onShowOnMap: (entry: ChatCardEntry) => void;
  onShowDirections: (entry: ChatCardEntry) => void;
  onItinerarySaved?: (count: number) => void;
}

export default function ChatSpotCards({
  entries,
  messageId,
  selectedIds,
  onToggleSpot,
  onShowOnMap,
  onShowDirections,
  onItinerarySaved,
}: ChatSpotCardsProps) {
  const savedRef = useRef<string | null>(null);

  const entriesKey = entries
    .map((e) => `${e.spot.id}:${e.scheduleTime ?? ""}`)
    .join("|");

  useEffect(() => {
    const shouldSave =
      entries.length >= 2 || entries.some((e) => e.scheduleTime);
    if (!shouldSave) return;
    if (savedRef.current === messageId) return;
    savedRef.current = messageId;
    saveItineraryFromCards(entries, messageId);
    onItinerarySaved?.(entries.length);
  }, [messageId, entriesKey, entries.length, onItinerarySaved, entries]);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2 pt-1">
      <p className="text-xs font-medium text-[var(--muted-soft)]">
        {entries.length} địa điểm · xem card đầy đủ ở{" "}
        <span className="font-semibold text-foreground">Bản đồ & địa điểm</span>{" "}
        bên phải
      </p>
      {entries.map((entry) => (
        <ChatSpotCardCompact
          key={entry.spot.id}
          entry={entry}
          selected={selectedIds.has(entry.spot.id)}
          onToggle={() => onToggleSpot(entry)}
          onShowOnMap={() => onShowOnMap(entry)}
          onShowDirections={() => onShowDirections(entry)}
        />
      ))}
    </div>
  );
}
