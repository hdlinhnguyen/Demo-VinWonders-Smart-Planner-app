"use client";

import { useState } from "react";
import type { Spot } from "../data/spots";
import type { ParkCoords } from "../data/locations";
import type { SimulatedPosition } from "../data/routeSimulation";
import LocationSimulator from "./LocationSimulator";
import VinWondersMap from "./VinWondersMap";

interface DiscoveryPanelProps {
  spots: Spot[];
  selectedIds: Set<string>;
  onToggleSpot: (spot: Spot) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  userPosition: SimulatedPosition;
  isSimulating: boolean;
  pickOnMap: boolean;
  onPickOnMapChange: (v: boolean) => void;
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onResetSimulation: () => void;
  pathError?: string | null;
  onGoToLocation: (id: string, autoStart?: boolean) => void;
  onGoToCoords: (coords: ParkCoords, autoStart?: boolean) => void;
  onTeleport: (id: string) => void;
  onUseRoute: (routeId: string, autoStart?: boolean) => void;
}

export default function DiscoveryPanel({
  spots,
  selectedIds,
  onToggleSpot,
  mobileOpen,
  onCloseMobile,
  userPosition,
  isSimulating,
  pickOnMap,
  onPickOnMapChange,
  onStartSimulation,
  onPauseSimulation,
  onResetSimulation,
  pathError,
  onGoToLocation,
  onGoToCoords,
  onTeleport,
  onUseRoute,
}: DiscoveryPanelProps) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const highlightedIds = new Set(spots.map((s) => s.id));

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
            Bản đồ & địa điểm
          </h2>
          {selectedIds.size > 0 && (
            <span className="ml-auto rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {selectedIds.size} đã chọn
            </span>
          )}
        </div>

        <LocationSimulator
          position={userPosition}
          isMoving={isSimulating}
          pathError={pathError}
          pickOnMap={pickOnMap}
          onPickOnMapChange={onPickOnMapChange}
          onStart={onStartSimulation}
          onPause={onPauseSimulation}
          onReset={onResetSimulation}
          onGoToLocation={onGoToLocation}
          onTeleport={onTeleport}
          onUseRoute={onUseRoute}
        />

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="scroll-area flex-1 overflow-y-auto p-4 lg:max-w-sm lg:border-r lg:border-border">
            <p className="mb-3 text-xs text-muted">
              {spots.length} kết quả · dữ liệu từ mock_data
            </p>
            <div className="space-y-4">
              {spots.map((spot) => (
                <SpotCard
                  key={spot.id}
                  spot={spot}
                  selected={selectedIds.has(spot.id)}
                  onToggle={() => onToggleSpot(spot)}
                  onShowOnMap={() => setFocusId(spot.id)}
                  onGoTo={() => onGoToLocation(spot.id, true)}
                />
              ))}
              {spots.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">
                  Không tìm thấy địa điểm phù hợp. Thử hỏi chatbot nhé.
                </p>
              )}
            </div>
          </div>

          <div className="relative hidden min-h-[280px] flex-1 lg:block">
            <VinWondersMap
              highlightedIds={highlightedIds}
              selectedIds={selectedIds}
              focusId={focusId}
              userPosition={userPosition}
              followUser={isSimulating}
              pickOnMap={pickOnMap}
              onMapPick={(c) => onGoToCoords(c, true)}
              onSelectLocation={(id) => setFocusId(id)}
            />
          </div>
        </div>

        <div className="border-t border-border p-3 lg:hidden">
          <p className="mb-2 text-xs font-medium text-muted">Bản đồ</p>
          <div className="relative h-56 overflow-hidden rounded-xl ring-1 ring-border">
            <VinWondersMap
              highlightedIds={highlightedIds}
              selectedIds={selectedIds}
              focusId={focusId}
              userPosition={userPosition}
              followUser={isSimulating}
              pickOnMap={pickOnMap}
              onMapPick={(c) => onGoToCoords(c, true)}
              onSelectLocation={(id) => setFocusId(id)}
            />
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
  onShowOnMap,
  onGoTo,
}: {
  spot: Spot;
  selected: boolean;
  onToggle: () => void;
  onShowOnMap: () => void;
  onGoTo: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-2xl bg-surface shadow-[0_2px_16px_rgba(0,0,0,0.06)] ring-1 ring-black/5 animate-in">
      <button
        type="button"
        onClick={onShowOnMap}
        className={`relative block w-full h-36 bg-gradient-to-br ${spot.gradient} text-left`}
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
          <p className="text-xs text-white/90">{spot.location}</p>
          <h3 className="text-base font-semibold text-white line-clamp-2">
            {spot.name}
          </h3>
        </div>
      </button>
      <p className="line-clamp-2 px-4 pt-3 text-xs leading-relaxed text-muted">
        {spot.description}
      </p>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs text-muted">{spot.waitTime}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onGoTo}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            Đi tới
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

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
