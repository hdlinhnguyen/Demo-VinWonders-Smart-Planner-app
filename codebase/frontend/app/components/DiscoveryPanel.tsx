"use client";

import { useState } from "react";
import type { Spot } from "../data/spots";
import type { ParkCoords } from "../data/locations";
import type { SimulatedPosition } from "../data/routeSimulation";
import LocationSimulator from "./LocationSimulator";
import NavigationBanner from "./NavigationBanner";
import SpotCard from "./SpotCard";
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
  navigationTarget?: { id: string; name: string } | null;
  onCancelNavigation?: () => void;
  onShowDirections: (id: string, name: string) => void;
  onGoToLocation: (id: string, autoStart?: boolean) => void;
  onGoToCoords: (coords: ParkCoords, autoStart?: boolean) => void;
  onTeleport: (id: string) => void;
  onUseRoute: (routeId: string, autoStart?: boolean) => void;
  /** Focus map từ chat card (controlled) */
  focusSpotId?: string | null;
  onFocusSpot?: (id: string) => void;
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
  navigationTarget,
  onCancelNavigation,
  onShowDirections,
  onGoToLocation,
  onGoToCoords,
  onTeleport,
  onUseRoute,
  focusSpotId,
  onFocusSpot,
}: DiscoveryPanelProps) {
  const [internalFocusId, setInternalFocusId] = useState<string | null>(null);
  const focusId = focusSpotId ?? internalFocusId;
  const highlightedIds = new Set(spots.map((s) => s.id));

  function focusSpot(id: string) {
    onFocusSpot?.(id);
    setInternalFocusId(id);
  }

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

        {navigationTarget && onCancelNavigation && (
          <NavigationBanner
            destinationName={navigationTarget.name}
            isMoving={isSimulating}
            isPreview={!isSimulating}
            progress={userPosition.progress}
            onCancel={onCancelNavigation}
          />
        )}

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
                  onShowOnMap={() => focusSpot(spot.id)}
                  onShowDirections={() => {
                    focusSpot(spot.id);
                    onShowDirections(spot.id, spot.name);
                  }}
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
              followUser={isSimulating || !!navigationTarget}
              pickOnMap={pickOnMap}
              navigationActive={!!navigationTarget}
              navigationDestinationId={navigationTarget?.id ?? null}
              onMapPick={(c) => onGoToCoords(c, true)}
              onSelectLocation={(id) => focusSpot(id)}
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
              followUser={isSimulating || !!navigationTarget}
              pickOnMap={pickOnMap}
              navigationActive={!!navigationTarget}
              navigationDestinationId={navigationTarget?.id ?? null}
              onMapPick={(c) => onGoToCoords(c, true)}
              onSelectLocation={(id) => focusSpot(id)}
            />
          </div>
        </div>
      </aside>
    </>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
