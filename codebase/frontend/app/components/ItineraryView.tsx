"use client";

import type { ItineraryItem } from "@/bot/tools";

interface Props {
  items: ItineraryItem[];
  onSwap: (item: ItineraryItem) => void;
}

export default function ItineraryView({ items, onSwap }: Props) {
  return (
    <div className="mt-3 space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className={`rounded-xl border px-4 py-3 text-sm ${
            item.warning
              ? "border-orange-200 bg-orange-50"
              : "border-border bg-surface"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded-md bg-accent/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-accent">
                  {item.time}
                </span>
                <span className="font-medium text-foreground truncate">{item.name}</span>
              </div>
              <p className="mt-1 text-[12px] text-muted leading-relaxed">{item.reason}</p>
              {item.warning && (
                <p className="mt-1.5 text-[11px] text-orange-700 font-medium">
                  ⚠️ {item.warning}
                </p>
              )}
            </div>
            {item.warning && (
              <button
                type="button"
                onClick={() => onSwap(item)}
                className="shrink-0 rounded-full border border-orange-300 bg-white px-2.5 py-1 text-[11px] font-medium text-orange-700 hover:bg-orange-100 transition whitespace-nowrap"
              >
                Đổi trò
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
