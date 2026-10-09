"use client";

import { useEffect, useRef, useState } from "react";
import { clampView, fitView, type NormBox, type View } from "@/lib/vehicle-box";

export function FrameLoupe({ src, box }: { src: string; box?: NormBox | null }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>({ scale: 1, x: 0, y: 0 });
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  function publish(next: View) {
    const frame = frameRef.current;
    const clamped = frame ? clampView(next, frame.clientWidth, frame.clientHeight) : next;
    viewRef.current = clamped;
    setView(clamped);
  }

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const next = fitView(box, frame.clientWidth, frame.clientHeight);
    viewRef.current = next;
    setView(next);
  }, [src, box]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = frame.getBoundingClientRect();
      const current = viewRef.current;
      const scale = Math.min(8, Math.max(1, current.scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const imageX = (px - current.x) / (rect.width * current.scale);
      const imageY = (py - current.y) / (rect.height * current.scale);
      const next = clampView(
        {
          scale,
          x: px - imageX * rect.width * scale,
          y: py - imageY * rect.height * scale,
        },
        rect.width,
        rect.height,
      );
      viewRef.current = next;
      setView(next);
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, []);

  function zoomBy(factor: number) {
    const frame = frameRef.current;
    if (!frame) return;
    const current = viewRef.current;
    const scale = Math.min(8, Math.max(1, current.scale * factor));
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    const px = width / 2;
    const py = height / 2;
    const imageX = (px - current.x) / (width * current.scale);
    const imageY = (py - current.y) / (height * current.scale);
    publish({
      scale,
      x: px - imageX * width * scale,
      y: py - imageY * height * scale,
    });
  }

  return (
    <div className="relative">
      <div
        ref={frameRef}
        className="aspect-video w-full cursor-grab overflow-hidden bg-black active:cursor-grabbing"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const current = viewRef.current;
          drag.current = { px: event.clientX, py: event.clientY, x: current.x, y: current.y };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start) return;
          publish({
            scale: viewRef.current.scale,
            x: start.x + event.clientX - start.px,
            y: start.y + event.clientY - start.py,
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onDoubleClick={() => {
          const frame = frameRef.current;
          if (!frame) return;
          publish(fitView(box, frame.clientWidth, frame.clientHeight));
        }}
      >
        <img
          src={src}
          alt="Confirmed frame. Scroll to zoom and drag to read the plate."
          draggable={false}
          className="pointer-events-none h-full w-full max-w-none select-none object-fill"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "0 0",
          }}
        />
      </div>
      <div className="absolute bottom-3 right-3 flex gap-2">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.25)}
          className="rounded-md border border-white/20 bg-black/60 px-3 py-1.5 font-mono text-sm text-white"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1.25)}
          className="rounded-md border border-white/20 bg-black/60 px-3 py-1.5 font-mono text-sm text-white"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
