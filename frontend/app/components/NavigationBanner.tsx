"use client";

interface NavigationBannerProps {
  destinationName: string;
  isMoving: boolean;
  isPreview?: boolean;
  progress: number;
  onCancel: () => void;
}

export default function NavigationBanner({
  destinationName,
  isMoving,
  isPreview = false,
  progress,
  onCancel,
}: NavigationBannerProps) {
  const pct = Math.round(progress * 100);

  return (
    <div className="border-b border-orange-200 bg-orange-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-base" aria-hidden>
          🧭
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-orange-900">
            {isPreview ? "Lộ trình đề xuất" : "Đang chỉ đường"}
          </p>
          <p className="mt-0.5 truncate text-xs text-orange-800">
            Tới <strong>{destinationName}</strong>
            {isPreview
              ? " · đang xem trên bản đồ"
              : isMoving
                ? ` · ${pct}%`
                : pct >= 100
                  ? " · đã tới"
                  : " · tạm dừng"}
          </p>
          {!isPreview && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-orange-200">
              <div
                className="h-full rounded-full bg-orange-500 transition-[width] duration-100"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-full border border-orange-300 bg-white px-3 py-1 text-xs font-medium text-orange-900 hover:bg-orange-100"
        >
          {isPreview ? "Ẩn lộ trình" : "Tắt chỉ đường"}
        </button>
      </div>
    </div>
  );
}
