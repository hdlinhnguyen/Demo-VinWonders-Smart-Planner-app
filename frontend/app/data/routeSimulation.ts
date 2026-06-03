import {

  getLocationById,

  ALL_LOCATIONS,

  PARK_ROUTES,

  PARK_ZONES,

  type ParkCoords,

  type ParkLocation,

} from "./locations";

import {

  findRoutePath,

  nearestLocationIdAt,

  pathIdsToWaypoints,

} from "./routeGraph";



export type { ParkCoords };



export const DEFAULT_SIMULATION_ROUTE_ID = "cong-vao-to-amazon-van";

export const DEFAULT_START_LOCATION_ID = "cong-vao";



export interface SimulationTrip {

  waypoints: ParkCoords[];

  pathLocationIds: string[];

  destinationId: string | null;

  destinationName: string;

  originLabel: string;

  routeId: string | null;

}



export interface SimulatedPosition {

  x: number;

  y: number;

  progress: number;

  isMoving: boolean;

  nearLocationId: string | null;

  nearLocationName: string | null;

  trip: SimulationTrip;

}



export function getSimulationRoute(routeId: string) {

  const route = PARK_ROUTES.find((r) => r.id === routeId);

  if (!route) return null;

  const from = getLocationById(route.fromLocationId);

  const to = getLocationById(route.toLocationId);

  if (!from || !to) return null;

  return { route, from, to };

}



function segmentLength(a: ParkCoords, b: ParkCoords): number {

  return Math.hypot(b.x - a.x, b.y - a.y);

}



function totalPathLength(waypoints: ParkCoords[]): number {

  let len = 0;

  for (let i = 1; i < waypoints.length; i++) {

    len += segmentLength(waypoints[i - 1], waypoints[i]);

  }

  return len;

}



export function pathSegmentFromProgress(
  waypoints: ParkCoords[],
  progress: number,
  samples = 20
): ParkCoords[] {
  const start = Math.max(0, Math.min(1, progress));
  const points: ParkCoords[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = start + ((1 - start) * i) / samples;
    points.push(positionOnWaypoints(waypoints, t));
  }
  return points;
}

/** Vị trí trên polyline route theo progress 0–1 (theo quãng đường) */
export function positionOnWaypoints(
  waypoints: ParkCoords[],
  t: number
): ParkCoords {

  if (waypoints.length === 0) return { x: 0, y: 0 };

  if (waypoints.length === 1) return { ...waypoints[0] };



  const clamped = Math.max(0, Math.min(1, t));

  const total = totalPathLength(waypoints);

  if (total === 0) return { ...waypoints[0] };



  let target = total * clamped;

  for (let i = 1; i < waypoints.length; i++) {

    const seg = segmentLength(waypoints[i - 1], waypoints[i]);

    if (target <= seg) {

      const local = seg === 0 ? 0 : target / seg;

      return {

        x: waypoints[i - 1].x + (waypoints[i].x - waypoints[i - 1].x) * local,

        y: waypoints[i - 1].y + (waypoints[i].y - waypoints[i - 1].y) * local,

      };

    }

    target -= seg;

  }

  return { ...waypoints[waypoints.length - 1] };

}



export function findNearestLocation(

  x: number,

  y: number

): ParkLocation | null {

  let best: ParkLocation | null = null;

  let bestD = Infinity;

  for (const loc of ALL_LOCATIONS) {

    const d = (loc.coords.x - x) ** 2 + (loc.coords.y - y) ** 2;

    if (d < bestD) {

      bestD = d;

      best = loc;

    }

  }

  return best;

}



export function createTripOnRoutes(

  fromCoords: ParkCoords,

  fromLabel: string,

  destinationId: string,

  routeId: string | null = null

): SimulationTrip | null {

  const dest = getLocationById(destinationId);

  if (!dest) return null;



  const startId = nearestLocationIdAt(fromCoords.x, fromCoords.y);

  if (!startId) return null;



  const pathIds = findRoutePath(startId, destinationId);

  if (!pathIds || pathIds.length === 0) return null;



  const waypoints = pathIdsToWaypoints(pathIds);

  if (waypoints.length === 0) return null;



  return {

    waypoints,

    pathLocationIds: pathIds,

    destinationId: dest.id,

    destinationName: dest.name,

    originLabel: fromLabel,

    routeId,

  };

}



export function tripFromLocationId(

  fromCoords: ParkCoords,

  fromLabel: string,

  destinationId: string,

  routeId: string | null = null

): SimulationTrip | null {

  return createTripOnRoutes(fromCoords, fromLabel, destinationId, routeId);

}



export function tripFromCoords(

  fromCoords: ParkCoords,

  fromLabel: string,

  toCoords: ParkCoords

): SimulationTrip | null {

  const near = findNearestLocation(toCoords.x, toCoords.y);

  if (!near) return null;

  return createTripOnRoutes(fromCoords, fromLabel, near.id, null);

}



export function tripFromPredefinedRoute(routeId: string): SimulationTrip | null {

  const seg = getSimulationRoute(routeId);

  if (!seg) return null;

  return createTripOnRoutes(

    seg.from.coords,

    seg.from.name,

    seg.to.id,

    routeId

  );

}



export function buildPosition(

  trip: SimulationTrip,

  progress: number,

  isMoving: boolean

): SimulatedPosition {

  const coords = positionOnWaypoints(trip.waypoints, progress);

  const near = findNearestLocation(coords.x, coords.y);

  return {

    x: coords.x,

    y: coords.y,

    progress,

    isMoving,

    nearLocationId: near?.id ?? null,

    nearLocationName: near?.name ?? null,

    trip,

  };

}



export function getDefaultTrip(): SimulationTrip {

  return (

    tripFromPredefinedRoute(DEFAULT_SIMULATION_ROUTE_ID) ??

    createTripOnRoutes(

      { x: 200, y: 920 },

      "Cổng vào",

      "amazon-van"

    ) ?? {

      waypoints: [

        { x: 200, y: 920 },

        { x: 250, y: 900 },

      ],

      pathLocationIds: ["cong-vao", "amazon-van"],

      destinationId: "amazon-van",

      destinationName: "Amazon Van",

      originLabel: "Cổng vào",

      routeId: null,

    }

  );

}



export function getDefaultPosition(): SimulatedPosition {

  const trip = getDefaultTrip();

  return buildPosition(trip, 0, false);

}



export function buildUserPositionContext(pos: SimulatedPosition): string {

  if (!pos.trip) {

    return (

      `Vị trí giả lập: x=${Math.round(pos.x)}, y=${Math.round(pos.y)} ` +

      `(gần ${pos.nearLocationName ?? "—"}).`

    );

  }

  const { trip } = pos;

  const pct = Math.round(pos.progress * 100);

  const atDest = pos.progress >= 1;



  if (pos.isMoving) {

    return (

      `Vị trí giả lập (đang đi bộ trên đường route): ${pct}% từ "${trip.originLabel}" → "${trip.destinationName}". ` +

      `Tọa độ x=${Math.round(pos.x)}, y=${Math.round(pos.y)}. ` +

      `Gần nhất: ${pos.nearLocationName ?? "—"}.`

    );

  }



  if (atDest) {

    return (

      `Vị trí giả lập: đã tới "${trip.destinationName}" (x=${Math.round(pos.x)}, y=${Math.round(pos.y)}).`

    );

  }



  return (

    `Vị trí giả lập (đứng yên trên route): ${pct}% tới "${trip.destinationName}" ` +

    `(xuất phát: ${trip.originLabel}). Gần ${pos.nearLocationName ?? "—"}.`

  );

}



export const SIMULATION_ROUTES = PARK_ROUTES.map((r) => ({

  id: r.id,

  label: r.name,

}));



export const DESTINATION_OPTIONS = PARK_ZONES.map((zone) => ({

  zone: zone.name,

  locations: ALL_LOCATIONS.filter((l) => l.zone === zone.name).map((l) => ({

    id: l.id,

    name: l.name,

  })),

}));


