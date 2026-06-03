"use client";

import { useState } from "react";
import type { SimulatedPosition } from "../data/routeSimulation";
import {
  DESTINATION_OPTIONS,
  DEFAULT_SIMULATION_ROUTE_ID,
  SIMULATION_ROUTES,
} from "../data/routeSimulation";

interface LocationSimulatorProps {
  position: SimulatedPosition;
  isMoving: boolean;
  pathError?: string | null;
  pickOnMap: boolean;
  onPickOnMapChange: (enabled: boolean) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onGoToLocation: (locationId: string, autoStart?: boolean) => void;
  onTeleport: (locationId: string) => void;
  onUseRoute: (routeId: string, autoStart?: boolean) => void;
}

export default function LocationSimulator({
  position,
  isMoving,
  pathError,
  pickOnMap,
  onPickOnMapChange,
  onStart,
  onPause,
  onReset,
  onGoToLocation,
  onTeleport,
  onUseRoute,
}: LocationSimulatorProps) {
  const [selectedDest, setSelectedDest] = useState(
    position.trip.destinationId ?? "amazon-van"
  );
  const pct = Math.round(position.progress * 100);
  const atEnd = position.progress >= 1;

  return (
    <div className="border-b border-border bg-[#f0f9ff] px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            isMoving ? "animate-pulse bg-blue-500" : "bg-blue-600"
          }`}
          aria-hidden
        />
        <p className="text-xs font-semibold text-foreground">
          Định vị giả lập
        </p>
        <span className="ml-auto text-[10px] text-muted">
          Chỉ đi trên route
        </span>
      </div>

      <p className="mt-1.5 text-xs text-muted">
        <span className="font-medium text-foreground">
          {position.trip.originLabel}
        </span>
        {" → "}
        <span className="font-medium text-foreground">
          {position.trip.destinationName}
        </span>
      </p>

      <label className="mt-2 block text-[11px] font-medium text-muted">
        Chọn đích đến
      </label>
      <select
        value={selectedDest}
        onChange={(e) => setSelectedDest(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-blue-500"
      >
        {DESTINATION_OPTIONS.map((group) => (
          <optgroup key={group.zone} label={group.zone}>
            {group.locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-blue-500 transition-[width] duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>

      {pathError && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900 ring-1 ring-amber-200">
          {pathError}
        </p>
      )}

      <p className="mt-1.5 text-[11px] text-muted">
        {pickOnMap
          ? "Bấm gần địa điểm trên route để chọn đích"
          : isMoving
            ? "Đang di chuyển…"
            : atEnd
              ? "Đã tới đích"
              : "Đứng yên"}{" "}
        · {pct}% · Gần{" "}
        <span className="font-medium text-foreground">
          {position.nearLocationName ?? "—"}
        </span>
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onGoToLocation(selectedDest, true)}
          disabled={isMoving}
          className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          Đi tới đích
        </button>
        <button
          type="button"
          onClick={() => onTeleport(selectedDest)}
          className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium hover:bg-black/5"
        >
          Nhảy tới
        </button>
        <button
          type="button"
          onClick={() => onPickOnMapChange(!pickOnMap)}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            pickOnMap
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-border bg-surface hover:bg-black/5"
          }`}
        >
          {pickOnMap ? "✓ Chọn trên map" : "Chọn trên map"}
        </button>
        {isMoving ? (
          <button
            type="button"
            onClick={onPause}
            className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium hover:bg-black/5"
          >
            Tạm dừng
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium hover:bg-black/5"
          >
            {atEnd ? "Đi tiếp" : "Tiếp tục"}
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium hover:bg-black/5"
        >
          Về Cổng vào
        </button>
      </div>

      {SIMULATION_ROUTES.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {SIMULATION_ROUTES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onUseRoute(r.id)}
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                position.trip.routeId === r.id
                  ? "bg-green-100 text-green-800"
                  : "bg-black/5 text-muted hover:bg-black/10"
              }`}
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onUseRoute(DEFAULT_SIMULATION_ROUTE_ID, true)}
            className="rounded-full bg-green-600/10 px-2 py-0.5 text-[10px] text-green-800 hover:bg-green-600/20"
          >
            Lối Cổng → Amazon (đi ngay)
          </button>
        </div>
      )}
    </div>
  );
}
