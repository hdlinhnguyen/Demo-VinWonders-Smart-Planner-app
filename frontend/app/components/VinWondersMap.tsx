"use client";

import { useEffect, useRef } from "react";
import type { Circle, Map as LeafletMap, Marker, Polyline } from "leaflet";
import type { ParkCoords } from "../data/locations";
import {
  pathSegmentFromProgress,
  type SimulatedPosition,
} from "../data/routeSimulation";
import {
  ALL_LOCATIONS,
  MAP_HEIGHT,
  MAP_WIDTH,
  PARK_DATA,
  PARK_ROUTES,
  PARK_ZONES,
  getLocationById,
  type ParkLocation,
} from "../data/locations";

const ICON_URLS: Record<string, string> = {
  restaurant:
    "https://img.icons8.com/color/48/000000/restaurant.png",
  medical: "https://img.icons8.com/color/48/quarantine.png",
  info: "https://img.icons8.com/color/48/000000/info.png",
  shopping: "https://img.icons8.com/color/48/000000/shopping-bag.png",
  adventure:
    "https://img.icons8.com/color/48/000000/roller-coaster.png",
  water: "https://img.icons8.com/color/48/theme-park.png",
  aquarium: "https://img.icons8.com/color/48/000000/turtle.png",
  viking: "https://img.icons8.com/color/48/000000/viking-helmet.png",
  magic: "https://img.icons8.com/color/48/magic-crystal-ball.png",
  castle: "https://img.icons8.com/color/48/000000/castle.png",
  gate: "https://img.icons8.com/color/48/000000/entrance.png",
  default: "https://img.icons8.com/color/48/000000/marker.png",
};

interface VinWondersMapProps {
  highlightedIds: Set<string>;
  selectedIds: Set<string>;
  focusId?: string | null;
  userPosition?: SimulatedPosition | null;
  followUser?: boolean;
  pickOnMap?: boolean;
  onMapPick?: (coords: ParkCoords) => void;
  onSelectLocation?: (id: string) => void;
}

export default function VinWondersMap({
  highlightedIds,
  selectedIds,
  focusId,
  userPosition,
  followUser = false,
  pickOnMap = false,
  onMapPick,
  onSelectLocation,
}: VinWondersMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const userMarkerRef = useRef<Marker | null>(null);
  const userCircleRef = useRef<Circle | null>(null);
  const tripLineRef = useRef<Polyline | null>(null);
  const remainLineRef = useRef<Polyline | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onSelectRef = useRef(onSelectLocation);
  const onMapPickRef = useRef(onMapPick);
  const pickOnMapRef = useRef(pickOnMap);
  onSelectRef.current = onSelectLocation;
  onMapPickRef.current = onMapPick;
  pickOnMapRef.current = pickOnMap;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      const leafletMod = await import("leaflet");
      const L = (leafletMod as unknown as { default: typeof import("leaflet") })
        .default;
      leafletRef.current = L;
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        crs: L.CRS.Simple,
        minZoom: -1,
        maxZoom: 3,
        zoomControl: true,
      });

      const z = map.getMaxZoom() - 1;
      const southWest = map.unproject([0, MAP_HEIGHT], z);
      const northEast = map.unproject([MAP_WIDTH, 0], z);
      const bounds = L.latLngBounds(southWest, northEast);
      map.fitBounds(bounds);

      const zoneColorByName = Object.fromEntries(
        PARK_ZONES.map((zone) => [zone.name, zone.color])
      );

      function createIcon(type: string) {
        const url = ICON_URLS[type] ?? ICON_URLS.default;
        return L.icon({
          iconUrl: url,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -15],
          className: "vinwonders-map-icon",
        });
      }

      function popupHtml(loc: ParkLocation) {
        const color = zoneColorByName[loc.zone] ?? "#333";
        return `<div style="min-width:180px;font-family:system-ui,sans-serif">
          <h4 style="margin:0 0 4px;color:${color};font-size:14px">${loc.name}</h4>
          <em style="display:block;font-size:11px;color:#666;margin-bottom:6px">${loc.zone}</em>
          <p style="margin:0;font-size:11px;line-height:1.4;color:#333">${loc.description.slice(0, 200)}${loc.description.length > 200 ? "…" : ""}</p>
        </div>`;
      }

      function projectPoint(loc: ParkLocation) {
        return map.unproject([loc.coords.x, loc.coords.y], z);
      }

      const markers = new Map<string, Marker>();

      for (const loc of ALL_LOCATIONS) {
        const latLng = projectPoint(loc);
        const marker = L.marker(latLng, {
          icon: createIcon(loc.type),
        }).addTo(map);
        marker.bindPopup(popupHtml(loc));
        marker.on("click", () => onSelectRef.current?.(loc.id));
        markers.set(loc.id, marker);
      }

      // Đường nối Cổng vào → Amazon Van (trước đường khu)
      for (const route of PARK_ROUTES) {
        const from = getLocationById(route.fromLocationId);
        const to = getLocationById(route.toLocationId);
        if (!from || !to) continue;
        L.polyline([projectPoint(from), projectPoint(to)], {
          color: route.style?.color ?? "#27ae60",
          weight: route.style?.weight ?? 5,
          opacity: 0.95,
          dashArray: route.style?.dashArray ?? "12, 6",
          lineJoin: "round",
        }).addTo(map);
      }

      // Đường đi theo từng khu (vòng khép kín) + đường trục đỏ — giống vinwondermap.html
      const mainRoutePoints: ReturnType<typeof projectPoint>[] = [];

      for (const zone of PARK_ZONES) {
        const zoneLocs = ALL_LOCATIONS.filter((l) => l.zone === zone.name);
        if (zoneLocs.length < 2) continue;

        const zonePoints = zoneLocs.map(projectPoint);
        zonePoints.push(zonePoints[0]);

        L.polyline(zonePoints, {
          color: zone.color,
          weight: 3,
          opacity: 0.7,
          dashArray: "8, 8",
          lineJoin: "round",
        }).addTo(map);

        mainRoutePoints.push(zonePoints[0]);
      }

      if (mainRoutePoints.length > 1) {
        const closedMain = [...mainRoutePoints, mainRoutePoints[0]];
        L.polyline(closedMain, {
          color: "#e74c3c",
          weight: 5,
          opacity: 0.8,
          dashArray: "15, 10",
          lineJoin: "round",
        }).addTo(map);
      }

      map.on("click", (e) => {
        if (!pickOnMapRef.current || !onMapPickRef.current) return;
        const pt = map.project(e.latlng, z);
        onMapPickRef.current({ x: pt.x, y: pt.y });
      });

      mapRef.current = map;
      markersRef.current = markers;
    })();

    return () => {
      cancelled = true;
      userMarkerRef.current = null;
      userCircleRef.current = null;
      tripLineRef.current = null;
      remainLineRef.current = null;
      leafletRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !userPosition) return;

    const z = map.getMaxZoom() - 1;
    const latLng = map.unproject([userPosition.x, userPosition.y], z);

    const userIcon = L.divIcon({
      className: "vinwonders-user-icon",
      html: `<div class="vinwonders-user-dot${userPosition.isMoving ? " is-moving" : ""}"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(latLng, {
        icon: userIcon,
        zIndexOffset: 2000,
      }).addTo(map);
      userMarkerRef.current.bindPopup(
        `<strong>Bạn đang ở đây</strong><br/>${userPosition.nearLocationName ?? ""}<br/><small>${Math.round(userPosition.progress * 100)}% lộ trình</small>`
      );
    } else {
      userMarkerRef.current.setLatLng(latLng);
      userMarkerRef.current.setIcon(userIcon);
      userMarkerRef.current.setPopupContent(
        `<strong>Bạn đang ở đây</strong><br/>${userPosition.nearLocationName ?? ""}<br/><small>${Math.round(userPosition.progress * 100)}% lộ trình</small>`
      );
    }

    const radiusPx = 28;
    if (!userCircleRef.current) {
      userCircleRef.current = L.circle(latLng, {
        radius: radiusPx,
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
        weight: 2,
        dashArray: "4, 4",
      }).addTo(map);
    } else {
      userCircleRef.current.setLatLng(latLng);
    }

    if (followUser || userPosition.isMoving) {
      map.panTo(latLng, { animate: true, duration: 0.35 });
    }

    const trip = userPosition.trip;
    const wps = trip.waypoints;
    if (wps.length >= 2) {
      const fullLl = wps.map((w) => map.unproject([w.x, w.y], z));
      if (!tripLineRef.current) {
        tripLineRef.current = L.polyline(fullLl, {
          color: "#94a3b8",
          weight: 2,
          opacity: 0.6,
          dashArray: "6, 8",
          lineJoin: "round",
        }).addTo(map);
      } else {
        tripLineRef.current.setLatLngs(fullLl);
      }

      if (userPosition.progress < 1) {
        const remainCoords = pathSegmentFromProgress(
          wps,
          userPosition.progress
        );
        const remainLl = remainCoords.map((w) =>
          map.unproject([w.x, w.y], z)
        );
        if (!remainLineRef.current) {
          remainLineRef.current = L.polyline(remainLl, {
            color: "#2563eb",
            weight: 4,
            opacity: 0.85,
            dashArray: "10, 6",
            lineJoin: "round",
          }).addTo(map);
        } else {
          remainLineRef.current.setLatLngs(remainLl);
        }
      } else if (remainLineRef.current) {
        remainLineRef.current.remove();
        remainLineRef.current = null;
      }
    } else if (tripLineRef.current) {
      tripLineRef.current.remove();
      tripLineRef.current = null;
      if (remainLineRef.current) {
        remainLineRef.current.remove();
        remainLineRef.current = null;
      }
    }
  }, [userPosition, followUser]);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || markers.size === 0) return;

    const hasFilter = highlightedIds.size > 0;

    markers.forEach((marker, id) => {
      const el = marker.getElement();
      if (!el) return;
      const selected = selectedIds.has(id);
      const highlighted = highlightedIds.has(id);
      const dim =
        hasFilter && !highlighted && !selected ? 0.35 : 1;
      el.style.opacity = String(dim);
      el.style.filter = selected
        ? "drop-shadow(0 0 6px #e67e22) scale(1.15)"
        : highlighted
          ? "drop-shadow(0 0 4px #3182ce)"
          : "";
      el.style.zIndex = selected ? "1000" : highlighted ? "500" : "";
    });
  }, [highlightedIds, selectedIds]);

  useEffect(() => {
    if (!focusId) return;
    const loc = getLocationById(focusId);
    const map = mapRef.current;
    const marker = markersRef.current.get(focusId);
    if (!loc || !map || !marker) return;
    const z = map.getMaxZoom() - 1;
    const latLng = map.unproject([loc.coords.x, loc.coords.y], z);
    map.setView(latLng, 1, { animate: true });
    setTimeout(() => marker.openPopup(), 350);
  }, [focusId]);

  return (
    <div className="relative h-full min-h-[280px] w-full flex-1">
      <div
        ref={containerRef}
        className={`absolute inset-0 z-0 bg-[#f4f3ef] ${
          pickOnMap ? "cursor-crosshair" : ""
        }`}
      />
      {pickOnMap && (
        <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow">
          Bấm bản đồ để chọn đích đến
        </div>
      )}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-xl bg-surface/95 px-3 py-2 text-xs shadow-md backdrop-blur">
        <span className="font-medium">{PARK_DATA.meta.park}</span>
        <span className="ml-2 text-muted">
          {ALL_LOCATIONS.length} địa điểm · mock_map
        </span>
      </div>
    </div>
  );
}
