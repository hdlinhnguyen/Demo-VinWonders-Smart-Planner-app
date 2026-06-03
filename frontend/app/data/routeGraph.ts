import {
  ALL_LOCATIONS,
  PARK_ROUTES,
  PARK_ZONES,
  getLocationById,
  type ParkCoords,
  type ParkLocation,
} from "./locations";

function findNearestLocation(x: number, y: number): ParkLocation | null {
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

type Graph = Map<string, Set<string>>;

let graphCache: Graph | null = null;

function addEdge(graph: Graph, a: string, b: string) {
  if (a === b) return;
  if (!graph.has(a)) graph.set(a, new Set());
  if (!graph.has(b)) graph.set(b, new Set());
  graph.get(a)!.add(b);
  graph.get(b)!.add(a);
}

/** Đồ thị đường đi giống vinwondermap: vòng từng khu + đường trục đỏ + routes JSON */
export function buildRouteGraph(): Graph {
  if (graphCache) return graphCache;

  const graph: Graph = new Map();

  for (const zone of PARK_ZONES) {
    const ids = ALL_LOCATIONS.filter((l) => l.zone === zone.name).map(
      (l) => l.id
    );
    for (let i = 0; i < ids.length; i++) {
      addEdge(graph, ids[i], ids[(i + 1) % ids.length]);
    }
  }

  const hubIds = PARK_ZONES.map((zone) => {
    const first = ALL_LOCATIONS.find((l) => l.zone === zone.name);
    return first?.id;
  }).filter((id): id is string => !!id);

  for (let i = 0; i < hubIds.length; i++) {
    addEdge(graph, hubIds[i], hubIds[(i + 1) % hubIds.length]);
  }

  for (const route of PARK_ROUTES) {
    addEdge(graph, route.fromLocationId, route.toLocationId);
  }

  graphCache = graph;
  return graph;
}

export function findRoutePath(
  startLocationId: string,
  endLocationId: string
): string[] | null {
  if (startLocationId === endLocationId) {
    return [startLocationId];
  }

  const graph = buildRouteGraph();
  if (!graph.has(startLocationId) || !graph.has(endLocationId)) {
    return null;
  }

  const queue: string[] = [startLocationId];
  const visited = new Set<string>([startLocationId]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === endLocationId) {
      const path: string[] = [endLocationId];
      let cur = endLocationId;
      while (parent.has(cur)) {
        cur = parent.get(cur)!;
        path.unshift(cur);
      }
      return path;
    }
    for (const next of graph.get(node) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      parent.set(next, node);
      queue.push(next);
    }
  }

  return null;
}

export function pathIdsToWaypoints(locationIds: string[]): ParkCoords[] {
  const waypoints: ParkCoords[] = [];
  for (const id of locationIds) {
    const loc = getLocationById(id);
    if (!loc) continue;
    const last = waypoints[waypoints.length - 1];
    if (
      last &&
      last.x === loc.coords.x &&
      last.y === loc.coords.y
    ) {
      continue;
    }
    waypoints.push({ ...loc.coords });
  }
  return waypoints;
}

export function nearestLocationIdAt(x: number, y: number): string | null {
  return findNearestLocation(x, y)?.id ?? null;
}

export function canReachLocation(
  fromLocationId: string,
  toLocationId: string
): boolean {
  return findRoutePath(fromLocationId, toLocationId) !== null;
}
