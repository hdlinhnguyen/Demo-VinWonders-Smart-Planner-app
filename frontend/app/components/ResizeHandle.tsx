"use client";

import type { MouseEvent } from "react";

interface ResizeHandleProps {
  onMouseDown: (e: MouseEvent) => void;
}

/** Thanh kéo giữa chat và panel bản đồ (desktop) */
export default function ResizeHandle({ onMouseDown }: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Kéo để thay đổi kích thước khung chat"
      className="group relative hidden w-px shrink-0 cursor-col-resize bg-border lg:block"
      onMouseDown={onMouseDown}
    >
      {/* Vùng bắt chuột rộng hơn đường kẻ */}
      <div className="absolute inset-y-0 -left-2 -right-2 z-10" />
      <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-transparent transition-colors group-hover:bg-accent/40 group-active:bg-accent/60" />
    </div>
  );
}
