"use client";

import type { ChatCardEntry } from "../data/chatCards";

interface ChatSpotCardCompactProps {
  entry: ChatCardEntry;
  selected: boolean;
  onToggle: () => void;
  onShowOnMap: () => void;
  onShowDirections: () => void;
}

/** Card gọn trong khung chat — chi tiết đầy đủ xem ở List bên cạnh */
export default function ChatSpotCardCompact({
  entry,
  selected,
  onToggle,
  onShowOnMap,
  onShowDirections,
}: ChatSpotCardCompactProps) {
  const { spot, scheduleTime } = entry;

  return (
    <article className="flex gap-3 rounded-xl border border-border bg-surface p-2.5 shadow-sm">
      <button
        type="button"
        onClick={onShowOnMap}
        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ${spot.gradient}`}
        aria-label={`Xem ${spot.name} trên map`}
      >
        <span
          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow"
          style={{ backgroundColor: `${spot.zoneColor}99` }}
        >
          ★{spot.rating}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {scheduleTime && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
              {scheduleTime}
            </span>
          )}
          <span className="text-[10px] text-[var(--muted-soft)]">{spot.category}</span>
        </div>
        <button
          type="button"
          onClick={onShowOnMap}
          className="mt-0.5 block w-full truncate text-left text-sm font-semibold text-foreground hover:text-accent"
        >
          {spot.name}
        </button>
        <p className="truncate text-[11px] text-[var(--muted-soft)]">{spot.location}</p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onShowDirections}
            className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-medium text-orange-800 hover:bg-orange-100"
          >
            Chỉ đường
          </button>
          <button
            type="button"
            onClick={onToggle}
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
              selected
                ? "bg-accent text-white"
                : "bg-foreground text-surface hover:opacity-90"
            }`}
          >
            {selected ? "✓ Đã chọn" : "+ Chọn"}
          </button>
        </div>
      </div>
    </article>
  );
}
