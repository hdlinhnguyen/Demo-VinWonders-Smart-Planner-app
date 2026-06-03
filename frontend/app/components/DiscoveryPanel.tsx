"use client";

import type { CSSProperties } from "react";
import type { Spot } from "../data/spots";

interface DiscoveryPanelProps {
  spots: Spot[];
  selectedIds: Set<string>;
  onToggleSpot: (spot: Spot) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function DiscoveryPanel({
  spots,
  selectedIds,
  onToggleSpot,
  mobileOpen,
  onCloseMobile,
}: DiscoveryPanelProps) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Đóng"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-surface transition-transform duration-300 lg:static lg:z-auto lg:max-w-none lg:flex-1 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header — giống Layla "Select cities" */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border lg:hidden"
            aria-label="Quay lại"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold tracking-tight">
            Chọn khu vui chơi
          </h2>
          {selectedIds.size > 0 && (
            <span className="ml-auto rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {selectedIds.size} đã chọn
            </span>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Media cards — scroll dọc như Layla */}
          <div className="scroll-area flex-1 overflow-y-auto p-4 lg:max-w-sm lg:border-r lg:border-border">
            <div className="space-y-4">
              {spots.map((spot) => (
                <SpotCard
                  key={spot.id}
                  spot={spot}
                  selected={selectedIds.has(spot.id)}
                  onToggle={() => onToggleSpot(spot)}
                />
              ))}
              {spots.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">
                  Không tìm thấy khu phù hợp. Thử hỏi chatbot nhé.
                </p>
              )}
            </div>
          </div>

          {/* Map mock — pin + giá vé style Layla */}
          <div className="relative hidden min-h-[280px] flex-1 bg-[#e8eef4] lg:block">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#dce8f0_0%,#c5d5e3_100%)]" />
            <svg
              className="absolute inset-0 h-full w-full opacity-30"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {spots.slice(0, 4).map((spot, i) => (
              <MapPin
                key={spot.id}
                spot={spot}
                selected={selectedIds.has(spot.id)}
                style={{
                  top: `${18 + i * 18}%`,
                  left: `${22 + (i % 2) * 35}%`,
                }}
              />
            ))}

            <div className="absolute bottom-4 left-4 rounded-xl bg-surface/95 px-3 py-2 text-xs shadow-md backdrop-blur">
              <span className="font-medium">VinWonders Phú Quốc</span>
              <span className="ml-2 text-muted">Bản đồ tham khảo</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function SpotCard({
  spot,
  selected,
  onToggle,
}: {
  spot: Spot;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-2xl bg-surface shadow-[0_2px_16px_rgba(0,0,0,0.06)] ring-1 ring-black/5 animate-in">
      <div
        className={`relative h-44 bg-gradient-to-br ${spot.gradient}`}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white backdrop-blur">
          <span className="font-medium">{spot.category}</span>
          <span>·</span>
          <span>★ {spot.rating}</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-xs text-white/90">{spot.location}</p>
          <h3 className="text-base font-semibold text-white">{spot.name}</h3>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs text-muted">Chờ ~ {spot.waitTime}</span>
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
    </article>
  );
}

function MapPin({
  spot,
  selected,
  style,
}: {
  spot: Spot;
  selected: boolean;
  style: CSSProperties;
}) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-full" style={style}>
      <div
        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-lg ${
          selected
            ? "bg-accent text-white"
            : "bg-surface text-foreground ring-1 ring-black/10"
        }`}
      >
        {spot.name.split(" ").slice(0, 2).join(" ")}
      </div>
      <div
        className={`mx-auto mt-0.5 h-2.5 w-2.5 rotate-45 ${
          selected ? "bg-accent" : "bg-surface ring-1 ring-black/10"
        }`}
      />
    </div>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
