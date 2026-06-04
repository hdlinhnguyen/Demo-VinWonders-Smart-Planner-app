import { nearestLocationIdAt } from "./routeGraph";
import {
  getAnchorAtPoint,
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

function nearestByTypeForVisit(
  x: number,
  y: number,
  type: string,
  limit: number
): LocationDistance[] {
  const anchorId = nearestLocationIdAt(x, y);
  return getNearestByType(x, y, type, limit + 3)
    .filter((item) => {
      if (item.id === anchorId && item.routeDistance < AT_LOCATION_THRESHOLD) {
        return false;
      }
      return true;
    })
    .slice(0, limit);
}

function standingAtMessage(x: number, y: number): string | null {
  const anchor = getAnchorAtPoint(x, y);
  if (!anchor || anchor.routeDistance >= AT_LOCATION_THRESHOLD) return null;
  return (
    `Bạn đang **rất gần / tại** **${anchor.name}** (${anchor.zone}, ${anchor.typeLabel}).\n\n`
  );
}

export function buildProximityReply(
  pos: SimulatedPosition,
  intent: ProximityIntent
): ProximityReplyResult {
  const { x, y } = pos;
  const lines: string[] = [positionHeader(pos)];
  let primary: LocationDistance | null = null;

  if (intent === "nearest_overall") {
    const anchor = getAnchorAtPoint(x, y);
    const ranked = getNearestLocations(x, y, 5);
    const routeNearest = ranked[0];

    if (!anchor && !routeNearest) {
      return {
        text:
          lines.join("") +
          "Không tính được khoảng cách route từ vị trí hiện tại.",
        suggestNav: null,
      };
    }

    const standing = standingAtMessage(x, y);
    if (standing) lines.push(standing);

    if (anchor) {
      lines.push(
        `**Địa điểm gắn vị trí của bạn trên bản đồ:**\n\n`,
        formatItem(anchor),
        `   _(Chấm xanh đang ở ~${Math.round(anchor.routeDistance)} đv từ điểm này.)_\n\n`
      );
      primary = anchor;
    }

    if (
      routeNearest &&
      (!anchor || routeNearest.id !== anchor.id)
    ) {
      lines.push(
        `**Địa điểm gần nhất theo đường đi trong công viên (route):**\n\n`,
        formatItem(routeNearest)
      );
      if (!primary) primary = routeNearest;
    } else if (routeNearest && !primary) {
      primary = routeNearest;
    }

    const topList = ranked
      .filter((item) => item.id !== anchor?.id)
      .slice(0, 3);
    if (topList.length > 0) {
      lines.push(`\n\n**Các địa điểm khác gần bạn (route):**\n\n`);
      topList.forEach((item, i) => lines.push(formatItem(item, i + 1)));
    }
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
