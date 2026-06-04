"use client";

import { useState, useRef } from "react";
import type { ItineraryItem } from "@/bot/tools";
import { makeItemId } from "@/bot/tools";

const STORAGE_KEY = "vinwonders_saved_itinerary";

interface Props {
  items: ItineraryItem[];
  onChange: (items: ItineraryItem[]) => void;
  onSwap: (item: ItineraryItem) => void;
}

export function loadSavedItinerary(): ItineraryItem[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ItineraryItem[];
  } catch {
    return null;
  }
}

export function clearSavedItinerary() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export default function ItineraryBoard({ items, onChange, onSwap }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  // ── Drag-to-reorder ──────────────────────────────────────
  function onDragStart(index: number) {
    dragIndex.current = index;
  }

  function onDragEnter(index: number) {
    dragOverIndex.current = index;
    if (dragIndex.current === null || dragIndex.current === index) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(index, 0, moved);
    dragIndex.current = index;
    onChange(next);
  }

  function onDragEnd() {
    dragIndex.current = null;
    dragOverIndex.current = null;
  }

  // ── Inline edit ──────────────────────────────────────────
  function updateItem(id: string, patch: Partial<ItineraryItem>) {
    onChange(items.map(it => it.id === id ? { ...it, ...patch } : it));
    setSaved(false);
  }

  // ── Add / Delete ─────────────────────────────────────────
  function addAfter(index: number) {
    const prev = items[index];
    const [h, m] = prev.time.split(":").map(Number);
    const nextMins = (h * 60 + m + (prev.durationMinutes || 45)) % (24 * 60);
    const newTime = `${String(Math.floor(nextMins / 60)).padStart(2, "0")}:${String(nextMins % 60).padStart(2, "0")}`;
    const blank: ItineraryItem = {
      id: makeItemId(),
      time: newTime,
      name: "Địa điểm mới",
      reason: "Chưa có ghi chú",
      durationMinutes: 45,
      warning: null,
    };
    const next = [...items];
    next.splice(index + 1, 0, blank);
    onChange(next);
    setSaved(false);
    setEditingId(blank.id);
  }

  function deleteItem(id: string) {
    onChange(items.filter(it => it.id !== id));
    setSaved(false);
  }

  // ── Save ─────────────────────────────────────────────────
  function saveItinerary() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      setSaved(true);
    } catch { /* ignore */ }
  }

  return (
    <div className="mt-3 space-y-1">
      {items.map((item, index) => (
        <div key={item.id}>
          <ItemCard
            item={item}
            editing={editingId === item.id}
            onStartEdit={() => setEditingId(item.id)}
            onStopEdit={() => setEditingId(null)}
            onUpdate={(patch) => updateItem(item.id, patch)}
            onDelete={() => deleteItem(item.id)}
            onSwap={() => onSwap(item)}
            onDragStart={() => onDragStart(index)}
            onDragEnter={() => onDragEnter(index)}
            onDragEnd={onDragEnd}
          />
          {/* Add-between button */}
          <div className="flex justify-center py-0.5 opacity-0 hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => addAfter(index)}
              className="rounded-full border border-dashed border-border bg-surface px-3 py-0.5 text-[11px] text-muted hover:border-accent hover:text-accent transition"
            >
              + thêm địa điểm
            </button>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-muted">
          {items.length} hoạt động · kéo thả để sắp xếp
        </span>
        <button
          type="button"
          onClick={saveItinerary}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            saved
              ? "border border-green-300 bg-green-50 text-green-700"
              : "bg-accent text-white hover:bg-accent-hover"
          }`}
        >
          {saved ? "✓ Đã lưu" : "Lưu lịch trình"}
        </button>
      </div>
    </div>
  );
}

// ── Single card ───────────────────────────────────────────
interface CardProps {
  item: ItineraryItem;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (patch: Partial<ItineraryItem>) => void;
  onDelete: () => void;
  onSwap: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

function ItemCard({
  item, editing, onStartEdit, onStopEdit, onUpdate,
  onDelete, onSwap, onDragStart, onDragEnter, onDragEnd,
}: CardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`group relative flex items-start gap-3 rounded-xl border px-3 py-2.5 transition cursor-grab active:cursor-grabbing active:opacity-60 ${
        item.warning
          ? "border-orange-200 bg-orange-50"
          : "border-border bg-surface hover:border-accent/30"
      }`}
    >
      {/* Drag handle */}
      <span className="mt-0.5 shrink-0 text-muted opacity-40 group-hover:opacity-80 select-none">
        ⠿
      </span>

      <div className="flex-1 min-w-0">
        {editing ? (
          <EditForm item={item} onUpdate={onUpdate} onDone={onStopEdit} />
        ) : (
          <ReadView item={item} onEdit={onStartEdit} />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex shrink-0 flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
        {!editing && (
          <button
            type="button"
            onClick={onStartEdit}
            className="rounded p-1 text-muted hover:bg-black/5 hover:text-foreground"
            title="Chỉnh sửa"
          >
            <PencilIcon />
          </button>
        )}
        {item.warning && (
          <button
            type="button"
            onClick={onSwap}
            className="rounded p-1 text-orange-500 hover:bg-orange-100"
            title="Đổi hoạt động"
          >
            <SwapIcon />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-500"
          title="Xoá"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

function ReadView({ item, onEdit }: { item: ItineraryItem; onEdit: () => void }) {
  return (
    <div className="cursor-default" onDoubleClick={onEdit}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-accent">
          {item.time}
        </span>
        <span className="text-sm font-medium text-foreground">{item.name}</span>
        {item.durationMinutes && (
          <span className="text-[11px] text-muted">~{item.durationMinutes} phút</span>
        )}
      </div>
      <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{item.reason}</p>
      {item.warning && (
        <p className="mt-1 text-[11px] font-medium text-orange-600">⚠️ {item.warning}</p>
      )}
    </div>
  );
}

function EditForm({
  item,
  onUpdate,
  onDone,
}: {
  item: ItineraryItem;
  onUpdate: (patch: Partial<ItineraryItem>) => void;
  onDone: () => void;
}) {
  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-2">
        <input
          type="time"
          defaultValue={item.time}
          onChange={(e) => onUpdate({ time: e.target.value })}
          className="rounded-lg border border-border bg-white px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <input
          type="number"
          defaultValue={item.durationMinutes}
          min={5}
          max={240}
          onChange={(e) => onUpdate({ durationMinutes: parseInt(e.target.value) || 45 })}
          className="w-20 rounded-lg border border-border bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="phút"
        />
      </div>
      <input
        type="text"
        defaultValue={item.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="w-full rounded-lg border border-border bg-white px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30"
        placeholder="Tên địa điểm"
      />
      <textarea
        defaultValue={item.reason}
        rows={2}
        onChange={(e) => onUpdate({ reason: e.target.value })}
        className="w-full resize-none rounded-lg border border-border bg-white px-2 py-1 text-xs text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
        placeholder="Ghi chú"
      />
      <button
        type="button"
        onClick={onDone}
        className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-white hover:bg-accent-hover"
      >
        Xong
      </button>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 16V4m0 0L3 8m4-4 4 4" />
      <path d="M17 8v12m0 0 4-4m-4 4-4-4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}
