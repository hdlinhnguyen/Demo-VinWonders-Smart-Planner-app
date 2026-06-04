import {
  ALL_LOCATIONS,
  LOCATION_TYPES,
  getLocationById,
  type ParkCoords,
} from "./locations";
import { findRoutePath, nearestLocationIdAt } from "./routeGraph";
import type { SimulatedPosition } from "./routeSimulation";
import { buildUserPositionContext } from "./routeSimulation";

/** Tốc độ đi bộ giả lập trên bản đồ (đơn vị tọa độ / phút) */
const WALK_SPEED_UNITS_PER_MIN = 85;

export interface LocationDistance {
  id: string;
  name: string;
  zone: string;
  type: string;
  typeLabel: string;
  routeDistance: number;
  walkMinutes: number;
  description: string;
}

function coordDistance(a: ParkCoords, b: ParkCoords): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pathLengthAlongRoute(locationIds: string[]): number {
  let len = 0;
  for (let i = 1; i < locationIds.length; i++) {
    const a = getLocationById(locationIds[i - 1]);
    const b = getLocationById(locationIds[i]);
    if (!a || !b) continue;
    len += coordDistance(a.coords, b.coords);
  }
  return len;
}

/** Khoảng cách theo route từ chấm (x,y) tới một địa điểm; null nếu không nối được */
export function routeDistanceFromPoint(
  x: number,
  y: number,
  targetLocationId: string
): number | null {
  const startId = nearestLocationIdAt(x, y);
  if (!startId) return null;

  const startLoc = getLocationById(startId);
  if (!startLoc) return null;

  const access = coordDistance({ x, y }, startLoc.coords);

  if (startId === targetLocationId) {
    return access;
  }

  const pathIds = findRoutePath(startId, targetLocationId);
  if (!pathIds || pathIds.length < 2) return null;

  return access + pathLengthAlongRoute(pathIds);
}

function toLocationDistance(
  loc: (typeof ALL_LOCATIONS)[number],
  routeDistance: number
): LocationDistance {
  return {
    id: loc.id,
    name: loc.name,
    zone: loc.zone,
    type: loc.type,
    typeLabel: loc.typeLabel,
    routeDistance,
    walkMinutes: Math.max(1, Math.round(routeDistance / WALK_SPEED_UNITS_PER_MIN)),
    description: loc.shortSummary ?? loc.description,
  };
}

export function rankLocationsByRouteDistance(
  x: number,
  y: number,
  filter?: (loc: (typeof ALL_LOCATIONS)[number]) => boolean
): LocationDistance[] {
  const results: LocationDistance[] = [];

  for (const loc of ALL_LOCATIONS) {
    if (filter && !filter(loc)) continue;
    const dist = routeDistanceFromPoint(x, y, loc.id);
    if (dist === null) continue;
    results.push(toLocationDistance(loc, dist));
  }

  results.sort((a, b) => a.routeDistance - b.routeDistance);
  return results;
}

export function getNearestLocations(
  x: number,
  y: number,
  limit = 5
): LocationDistance[] {
  return rankLocationsByRouteDistance(x, y).slice(0, limit);
}

export function getNearestByType(
  x: number,
  y: number,
  type: string,
  limit = 3
): LocationDistance[] {
  return rankLocationsByRouteDistance(x, y, (loc) => loc.type === type).slice(
    0,
    limit
  );
}

function formatDistanceLine(item: LocationDistance, rank?: number): string {
  const prefix = rank !== undefined ? `${rank}. ` : "- ";
  return (
    `${prefix}**${item.name}** (${item.typeLabel}, ${item.zone}) — ` +
    `~${Math.round(item.routeDistance)} đv bản đồ, ~${item.walkMinutes} phút đi bộ theo route. ` +
    `${item.description.slice(0, 120)}${item.description.length > 120 ? "…" : ""}`
  );
}

export function buildProximityContext(x: number, y: number): string {
  const nearest = getNearestLocations(x, y, 5);
  const nearestOverall = nearest[0] ?? null;

  const typeQueries = Object.values(LOCATION_TYPES).map((def) => ({
    label: def.typeLabel,
    type: def.id,
  }));

  const lines: string[] = [
    "## Phân tích vị trí & khoảng cách route (runtime)",
    "Nguồn: mock_data + tọa độ chấm xanh trên mock_map.",
    "Khoảng cách = quãng đường đi theo mạng route (vòng khu + đường trục + routes JSON), **không** phải đường chim bay.",
    `Tọa độ chấm xanh hiện tại: x=${Math.round(x)}, y=${Math.round(y)}.`,
  ];

  if (nearestOverall) {
    lines.push(
      "",
      `### Địa điểm GẦN NHẤT (theo route)`,
      formatDistanceLine(nearestOverall),
      `(Đây là câu trả lời chuẩn cho "tôi đang ở gần địa điểm nào nhất".)`
    );
  }

  lines.push("", "### Top 5 địa điểm gần nhất (route):");
  if (nearest.length === 0) {
    lines.push("- Không tính được khoảng cách route.");
  } else {
    nearest.forEach((item, i) => lines.push(formatDistanceLine(item, i + 1)));
  }

  for (const { label, type } of typeQueries) {
    const items = getNearestByType(x, y, type, 3);
    lines.push("", `### ${label} gần nhất:`);
    if (items.length === 0) {
      lines.push("- Không có địa điểm loại này hoặc không nối route.");
    } else {
      items.forEach((item, i) => lines.push(formatDistanceLine(item, i + 1)));
    }
  }

  return lines.join("\n");
}

/** Context ngắn cho LLM (không dùng cho câu hỏi vị trí — those are deterministic) */
export function buildCompactLocationContext(pos: SimulatedPosition): string {
  const nearest = getNearestLocations(pos.x, pos.y, 3);
  const adv = getNearestByType(pos.x, pos.y, "adventure", 1)[0];
  const lines = [
    `Chấm xanh: x=${Math.round(pos.x)}, y=${Math.round(pos.y)}`,
    nearest[0]
      ? `Gần nhất (route): ${nearest[0].name} (~${nearest[0].walkMinutes} phút)`
      : "",
    adv ? `Mạo hiểm gần nhất: ${adv.name} (~${adv.walkMinutes} phút)` : "",
  ].filter(Boolean);
  return lines.join(". ");
}

/** Ghép trạng thái di chuyển + bảng khoảng cách route cho system prompt */
export function buildFullUserLocationContext(
  pos: SimulatedPosition
): string {
  return [buildUserPositionContext(pos), buildCompactLocationContext(pos)].join(
    "\n"
  );
}
