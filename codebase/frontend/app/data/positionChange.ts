import type { SimulatedPosition } from "./routeSimulation";

/** Khoảng cách tối thiểu (đv bản đồ) coi là đổi chỗ đáng kể */
export const POSITION_MOVE_THRESHOLD = 80;

/** Nhảy một frame (teleport / chọn map) */
export const POSITION_JUMP_THRESHOLD = 120;

export interface PositionSnapshot {
  x: number;
  y: number;
  nearLocationId: string | null;
}

export function snapshotPosition(pos: SimulatedPosition): PositionSnapshot {
  return {
    x: pos.x,
    y: pos.y,
    nearLocationId: pos.nearLocationId,
  };
}

function distance(a: PositionSnapshot, b: PositionSnapshot): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** So sánh vị trí lúc trả lời chat với vị trí hiện tại */
export function hasMovedSinceSnapshot(
  saved: PositionSnapshot | null | undefined,
  current: SimulatedPosition
): boolean {
  if (!saved) return false;
  return distance(saved, snapshotPosition(current)) >= POSITION_MOVE_THRESHOLD;
}

/**
 * Phát hiện user đổi chỗ sau câu trả lời (tránh báo nhầm khi đang đi từng bước trên route).
 */
export function shouldInvalidateStaleReply(
  saved: PositionSnapshot | null | undefined,
  current: SimulatedPosition,
  previousFrame: PositionSnapshot | null | undefined
): boolean {
  if (!saved) return false;

  const fromSaved = distance(saved, snapshotPosition(current));
  if (fromSaved < POSITION_MOVE_THRESHOLD) return false;

  if (previousFrame) {
    const frameJump = distance(previousFrame, snapshotPosition(current));
    if (frameJump >= POSITION_JUMP_THRESHOLD) return true;
  }

  if (!current.isMoving) return true;

  return false;
}

export function formatPositionMovedNotice(pos: SimulatedPosition): string {
  const place = pos.nearLocationName
    ? `gần **${pos.nearLocationName}**`
    : `x=${Math.round(pos.x)}, y=${Math.round(pos.y)}`;
  return (
    `📍 **Bạn đã di chuyển** — hiện tại ${place}.\n\n` +
    `Câu trả lời phía trên tính theo vị trí cũ. Hỏi lại (vd: "gần nhất", "trạm y tế") để cập nhật theo chỗ mới.`
  );
}

/** Ghi chú ngắn cho LLM khi gửi tin sau khi đổi chỗ */
export function buildMovedContextNote(
  saved: PositionSnapshot | null | undefined,
  current: SimulatedPosition
): string | undefined {
  if (!hasMovedSinceSnapshot(saved, current)) return undefined;
  const near = current.nearLocationName ?? "—";
  return (
    `Người dùng đã di chuyển đáng kể sau câu trả lời trước. ` +
    `Ưu tiên vị trí chấm xanh hiện tại (x=${Math.round(current.x)}, y=${Math.round(current.y)}, gần ${near}); ` +
    `không dùng khoảng cách/địa điểm gần nhất từ lượt trả lời cũ.`
  );
}
