"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildPosition,
  getDefaultPosition,
  getDefaultTrip,
  tripFromCoords,
  tripFromLocationId,
  tripFromPredefinedRoute,
  type ParkCoords,
  type SimulatedPosition,
  type SimulationTrip,
} from "../data/routeSimulation";
import { getLocationById } from "../data/locations";

const TICK_MS = 50;
const PROGRESS_PER_TICK = 0.004;

function originLabelFromPosition(pos: SimulatedPosition): string {
  return pos.nearLocationName ?? "Vị trí hiện tại";
}

export function useRouteSimulation() {
  const [position, setPosition] = useState<SimulatedPosition>(() =>
    getDefaultPosition()
  );
  const [isMoving, setIsMoving] = useState(false);
  const [pickOnMap, setPickOnMap] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);
  const tripRef = useRef<SimulationTrip>(getDefaultTrip());
  const progressRef = useRef(0);

  const syncFromTrip = useCallback((progress: number, moving: boolean) => {
    progressRef.current = progress;
    setPosition(buildPosition(tripRef.current, progress, moving));
  }, []);

  useEffect(() => {
    if (!isMoving) return;

    const id = window.setInterval(() => {
      let next = progressRef.current + PROGRESS_PER_TICK;
      if (next >= 1) {
        next = 1;
        setIsMoving(false);
      }
      syncFromTrip(next, next < 1);
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [isMoving, syncFromTrip]);

  const setTrip = useCallback(
    (trip: SimulationTrip, startProgress = 0, autoStart = false) => {
      tripRef.current = trip;
      syncFromTrip(startProgress, false);
      if (autoStart) {
        setIsMoving(true);
        setPosition(buildPosition(trip, startProgress, true));
      }
    },
    [syncFromTrip]
  );

  const goToLocation = useCallback(
    (destinationId: string, autoStart = true) => {
      setIsMoving(false);
      setPathError(null);
      const trip = tripFromLocationId(
        { x: position.x, y: position.y },
        originLabelFromPosition(position),
        destinationId
      );
      if (!trip) {
        const dest = getLocationById(destinationId);
        setPathError(
          dest
            ? `Không có đường route nối tới "${dest.name}". Chọn địa điểm khác hoặc đi qua khu trung gian.`
            : "Không tìm thấy địa điểm."
        );
        return;
      }
      setTrip(trip, 0, autoStart);
    },
    [position, setTrip]
  );

  const goToCoords = useCallback(
    (coords: ParkCoords, autoStart = true) => {
      setIsMoving(false);
      setPathError(null);
      const trip = tripFromCoords(
        { x: position.x, y: position.y },
        originLabelFromPosition(position),
        coords
      );
      setPickOnMap(false);
      if (!trip) {
        setPathError(
          "Không có route tới điểm này. Bấm gần một địa điểm trên đường đi."
        );
        return;
      }
      setTrip(trip, 0, autoStart);
    },
    [position, setTrip]
  );

  const usePredefinedRoute = useCallback(
    (routeId: string, autoStart = false) => {
      setPathError(null);
      const trip = tripFromPredefinedRoute(routeId);
      if (!trip) {
        setPathError("Không tìm thấy lộ trình route này.");
        return;
      }
      setTrip(trip, 0, autoStart);
    },
    [setTrip]
  );

  const teleportToLocation = useCallback((destinationId: string) => {
    const loc = getLocationById(destinationId);
    if (!loc) return;
    setIsMoving(false);
    setPathError(null);
    const trip: SimulationTrip = {
      waypoints: [{ ...loc.coords }],
      pathLocationIds: [loc.id],
      destinationId: loc.id,
      destinationName: loc.name,
      originLabel: loc.name,
      routeId: null,
    };
    tripRef.current = trip;
    syncFromTrip(1, false);
  }, [syncFromTrip]);

  const start = useCallback(() => {
    if (progressRef.current >= 1) {
      const destId = tripRef.current.destinationId;
      if (destId) {
        const next = tripFromLocationId(
          { x: position.x, y: position.y },
          tripRef.current.destinationName,
          destId,
          tripRef.current.routeId
        );
        if (next) tripRef.current = next;
      }
      syncFromTrip(0, false);
    }
    setIsMoving(true);
    setPosition((p) => ({ ...p, isMoving: true }));
  }, [syncFromTrip, position]);

  const pause = useCallback(() => {
    setIsMoving(false);
    setPosition((p) => ({ ...p, isMoving: false }));
  }, []);

  const resetToStart = useCallback(() => {
    setIsMoving(false);
    setPickOnMap(false);
    setPathError(null);
    tripRef.current = getDefaultTrip();
    syncFromTrip(0, false);
  }, [syncFromTrip]);

  return {
    position,
    isMoving,
    pickOnMap,
    setPickOnMap,
    pathError,
    goToLocation,
    goToCoords,
    usePredefinedRoute,
    teleportToLocation,
    start,
    pause,
    resetToStart,
  };
}
