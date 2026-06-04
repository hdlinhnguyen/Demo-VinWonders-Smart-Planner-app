"use client";

import type { Spot } from "../data/spots";

export interface SpotCardProps {
  spot: Spot;
  selected: boolean;
  onToggle: () => void;
  onShowOnMap: () => void;
  onShowDirections: () => void;
  /** Khung giờ lịch trình (vd: 09:00 – 10:30) */
  scheduleTime?: string;
  /** Thu gọn cho cột chat hẹp */
  compact?: boolean;
}

export default function SpotCard({
  spot,
  selected,
  onToggle,
  onShowOnMap,
  onShowDirections,
  scheduleTime,
  compact = false,
}: SpotCardProps) {
  return (
    <article className="group overflow-hidden rounded-2xl bg-surface shadow-[0_2px_16px_rgba(0,0,0,0.06)] ring-1 ring-black/5 animate-in">
      <button
        type="button"
        onClick={onShowOnMap}
        className={`relative block w-full bg-gradient-to-br text-left ${spot.gradient} ${
          compact ? "h-28" : "h-36"
        }`}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div
          className="absolute left-3 top-3 flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] text-white backdrop-blur"
          style={{ backgroundColor: `${spot.zoneColor}cc` }}
        >
          <span className="font-medium">{spot.category}</span>
          <span>·</span>
          <span>★ {spot.rating}</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          {scheduleTime && (
            <p className="mb-1 inline-flex rounded-full bg-black/35 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
              🕐 {scheduleTime}
            </p>
          )}
          <p className="text-xs text-white/90">{spot.location}</p>
          <h3
            className={`font-semibold text-white line-clamp-2 ${
              compact ? "text-sm" : "text-base"
            }`}
          >
            {spot.name}
          </h3>
        </div>
      </button>
      <p
        className={`line-clamp-2 px-4 pt-3 leading-relaxed text-muted ${
          compact ? "text-[11px]" : "text-xs"
        }`}
      >
        {spot.description}
      </p>
      <div
        className={`flex items-center justify-between px-4 py-3 ${
          compact ? "flex-wrap gap-2" : ""
        }`}
      >
        <span className="text-xs text-muted">
          {scheduleTime ? (
            <span className="font-medium text-foreground/80">{scheduleTime}</span>
          ) : (
            spot.waitTime
          )}
        </span>
        <div className={`flex gap-2 ${compact ? "flex-wrap" : ""}`}>
          <button
            type="button"
            onClick={onShowDirections}
            className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
          >
            Chỉ đường
          </button>
          <button
            type="button"
            onClick={onShowOnMap}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-black/5"
          >
            Xem map
          </button>
          <button
            type="button"
            onClick={onToggle}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
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
