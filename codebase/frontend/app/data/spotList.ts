import { rankLocationsByRouteDistance } from "./locationProximity";
import {
  ALL_SPOTS,
  getLocationById,
  locationToSpot,
  type Spot,
} from "./locations";

/** Gợi ý gần vị trí user (theo route), không trả về toàn bộ công viên */
export function getSuggestedSpotsNear(
  x: number,
  y: number,
  limit = 10
): Spot[] {
  const ranked = rankLocationsByRouteDistance(x, y).slice(0, limit);
  const order = new Map(ranked.map((r, i) => [r.id, i]));
  return ALL_SPOTS.filter((s) => order.has(s.id)).sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  );
}

/** Địa điểm trong một khu (zone), ưu tiên gần user */
export function getSpotsForZone(
  zoneName: string,
  near?: { x: number; y: number },
  limit = 16
): Spot[] {
  if (!zoneName) return [];

  if (near) {
    const ranked = rankLocationsByRouteDistance(
      near.x,
      near.y,
      (loc) => loc.zone === zoneName
    ).slice(0, limit);
    if (ranked.length > 0) {
      const order = new Map(ranked.map((r, i) => [r.id, i]));
      return ALL_SPOTS.filter((s) => order.has(s.id)).sort(
        (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
      );
    }
  }

  return ALL_SPOTS.filter((s) => s.location === zoneName).slice(0, limit);
}

export function getZoneNameForLocationId(locationId: string): string | null {
  return getLocationById(locationId)?.zone ?? null;
}

export function spotFromLocationId(locationId: string): Spot | undefined {
  const loc = getLocationById(locationId);
  return loc ? locationToSpot(loc) : undefined;
}
