"use client";

import { useEffect, useRef } from "react";
import type { ChatCardEntry } from "../data/chatCards";
import { saveItineraryFromCards } from "../data/itineraryStorage";
import SpotCard from "./SpotCard";

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

  const hasSchedule = entries.some((e) => e.scheduleTime);

  return (
    <div className="space-y-3 pt-1">
      <p className="text-xs font-medium text-muted">
        {entries.length} địa điểm
        {hasSchedule ? " · có khung giờ lịch trình" : ""}
        {" · "}
        bấm + Chọn để lưu mục yêu thích
      </p>
      {entries.map((entry) => (
        <SpotCard
          key={entry.spot.id}
          spot={entry.spot}
          scheduleTime={entry.scheduleTime}
          compact
          selected={selectedIds.has(entry.spot.id)}
          onToggle={() => onToggleSpot(entry)}
          onShowOnMap={() => onShowOnMap(entry)}
          onShowDirections={() => onShowDirections(entry)}
        />
      ))}
    </div>
  );
}
