import { nearestLocationIdAt } from "./routeGraph";
import {
  getNearestByType,
  getNearestLocations,
  type LocationDistance,
} from "./locationProximity";
import {
  intentToLocationType,
  intentToTypeLabel,
  type ProximityIntent,
} from "./locationIntent";
import type { SimulatedPosition } from "./routeSimulation";

const AT_LOCATION_THRESHOLD = 30;

export interface ProximityReplyResult {
  text: string;
  suggestNav: { id: string; name: string } | null;
}

function formatItem(item: LocationDistance, rank?: number): string {
  const head =
    rank !== undefined ? `${rank}. **${item.name}**` : `**${item.name}**`;
  return (
    `${head}\n` +
    `   • Khu: ${item.zone}\n` +
    `   • Loại: ${item.typeLabel}\n` +
    `   • ~${item.walkMinutes} phút đi bộ theo route (~${Math.round(item.routeDistance)} đv bản đồ)\n` +
    `   • ${(item.description.length > 180 ? item.description.slice(0, 180) + "…" : item.description)}`
  );
}

function navOffer(name: string): string {
  return (
    `\n\n---\n` +
    `Bạn có muốn **chỉ đường** tới **${name}** trên bản đồ không?\n` +
    `Trả lời **Có** hoặc **Không** (hoặc bấm nút bên dưới).`
  );
}

function positionHeader(pos: SimulatedPosition): string {
  const moving = pos.isMoving ? " (đang di chuyển trên route)" : "";
  return (
    `📍 **Vị trí chấm xanh hiện tại:** x=${Math.round(pos.x)}, y=${Math.round(pos.y)}${moving}\n` +
    `(Cập nhật realtime từ bản đồ mock_data)\n`
  );
}

function nearestExcludingStanding(
  x: number,
  y: number,
  filter?: (loc: { id: string; type: string }) => boolean
): LocationDistance[] {
  const anchorId = nearestLocationIdAt(x, y);
  const all = getNearestLocations(x, y, 20);
  return all.filter((item) => {
    if (filter && !filter({ id: item.id, type: item.type })) return false;
    if (item.id === anchorId && item.routeDistance < AT_LOCATION_THRESHOLD) {
      return false;
    }
    return true;
  });
}

function nearestByTypeForVisit(
  x: number,
  y: number,
  type: string,
  limit: number
): LocationDistance[] {
  return nearestExcludingStanding(x, y, (loc) => loc.type === type).slice(
    0,
    limit
  );
}

function standingAtMessage(x: number, y: number): string | null {
  const anchorId = nearestLocationIdAt(x, y);
  if (!anchorId) return null;
  const nearest = getNearestLocations(x, y, 1)[0];
  if (!nearest || nearest.routeDistance >= AT_LOCATION_THRESHOLD) return null;
  return `Bạn đang **rất gần / tại** **${nearest.name}** (${nearest.zone}).\n\n`;
}

export function buildProximityReply(
  pos: SimulatedPosition,
  intent: ProximityIntent
): ProximityReplyResult {
  const { x, y } = pos;
  const lines: string[] = [positionHeader(pos)];
  let primary: LocationDistance | null = null;

  if (intent === "nearest_overall") {
    const standing = standingAtMessage(x, y);
    const nearest = getNearestLocations(x, y, 1)[0];
    if (!nearest) {
      return {
        text:
          lines.join("") +
          "Không tính được khoảng cách route từ vị trí hiện tại.",
        suggestNav: null,
      };
    }
    primary = nearest;
    if (standing) lines.push(standing);
    lines.push(
      `**Địa điểm gần chấm xanh nhất (theo route):**\n\n`,
      formatItem(nearest),
      `\n\n**Top 3 gần nhất:**\n\n`,
      ...getNearestLocations(x, y, 3).map((item, i) => formatItem(item, i + 1))
    );
  } else {
    const type = intentToLocationType(intent);
    if (!type) {
      return { text: lines.join(""), suggestNav: null };
    }

    const label = intentToTypeLabel(intent);
    const items = nearestByTypeForVisit(x, y, type, 3);

    if (items.length === 0) {
      const fallback = getNearestByType(x, y, type, 1)[0];
      if (fallback && fallback.routeDistance < AT_LOCATION_THRESHOLD) {
        return {
          text: lines
            .concat(
              `Bạn đang ngay tại **${fallback.name}** — đây là ${label} gần nhất.\n\n`,
              formatItem(fallback)
            )
            .join(""),
          suggestNav: null,
        };
      }
      return {
        text: lines
          .concat(`Không tìm thấy ${label} nào nối route từ vị trí hiện tại.`)
          .join(""),
        suggestNav: null,
      };
    }

    primary = items[0];
    lines.push(
      `**${label.charAt(0).toUpperCase() + label.slice(1)} gần chấm xanh nhất (theo route):**\n\n`,
      formatItem(items[0]),
      `\n\n**Gợi ý thêm:**\n\n`,
      ...items.slice(1).map((item, i) => formatItem(item, i + 2))
    );
  }

  if (!primary) {
    return { text: lines.join(""), suggestNav: null };
  }

  lines.push(navOffer(primary.name));
  return {
    text: lines.join(""),
    suggestNav: { id: primary.id, name: primary.name },
  };
}

/** @deprecated use buildProximityReply */
export function formatProximityReply(
  pos: SimulatedPosition,
  intent: ProximityIntent
): string {
  return buildProximityReply(pos, intent).text;
}

export function formatMissingPositionReply(): string {
  return (
    "Mình chưa nhận được **vị trí chấm xanh** từ bản đồ.\n\n" +
    "Hãy mở panel **Bản đồ & địa điểm** (bấm **Khám phá** trên mobile) — " +
    "vị trí sẽ được gửi kèm mỗi tin nhắn trước khi hỏi lại."
  );
}
