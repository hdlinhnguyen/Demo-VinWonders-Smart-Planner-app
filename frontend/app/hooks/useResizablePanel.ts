"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

const STORAGE_KEY = "vinwonders-chat-width";

interface Options {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function useResizablePanel({
  defaultWidth = 420,
  minWidth = 300,
  maxWidth = 720,
}: Options = {}) {
  const [width, setWidth] = useState(defaultWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(defaultWidth);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const n = Number(saved);
        if (!Number.isNaN(n) && n >= minWidth && n <= maxWidth) {
          setWidth(n);
        }
      }
    } catch {
      /* ignore */
    }
  }, [minWidth, maxWidth]);

  const clamp = useCallback(
    (w: number) => Math.min(maxWidth, Math.max(minWidth, w)),
    [minWidth, maxWidth]
  );

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      setWidth(clamp(startWidth.current + (e.clientX - startX.current)));
    }

    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.dispatchEvent(new Event("resize"));
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [clamp]);

  const startDrag = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width]
  );

  useEffect(() => {
    if (dragging.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(width));
    } catch {
      /* ignore */
    }
  }, [width]);

  return { width, startDrag, minWidth, maxWidth };
}
