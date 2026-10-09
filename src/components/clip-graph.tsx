import { cameraLabel } from "@/lib/labels";
import type { Clip } from "@/lib/types";

export function ClipGraph({
  clips,
  activeId,
  onSelect,
}: {
  clips: Clip[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const cols = clips.length > 18 ? 5 : 4;
  const rows = Math.max(1, Math.ceil(clips.length / cols));
  const points = clips.map((clip, index) => ({
    clip,
    index,
    x: ((index % cols) + 0.5) * (100 / cols),
    y: (Math.floor(index / cols) + 0.5) * (100 / rows),
  }));

  return (
    <div className="glass relative min-h-[28rem] overflow-hidden rounded-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(94,231,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(94,231,255,0.05)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {points.map((point, index) => {
          const next = points[index + 1];
          const below = points[index + cols];
          const active = point.clip.id === activeId;
          return (
            <g key={point.clip.id}>
              {next && Math.floor(index / cols) === Math.floor((index + 1) / cols) ? (
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={next.x}
                  y2={next.y}
                  stroke="#5ee7ff"
                  strokeWidth={active || next.clip.id === activeId ? 0.45 : 0.18}
                  strokeOpacity={active || next.clip.id === activeId ? 0.9 : 0.35}
                />
              ) : null}
              {below ? (
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={below.x}
                  y2={below.y}
                  stroke="#5ee7ff"
                  strokeWidth={active || below.clip.id === activeId ? 0.45 : 0.18}
                  strokeOpacity={active || below.clip.id === activeId ? 0.9 : 0.35}
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      {points.map((point) => {
        const active = point.clip.id === activeId;
        const matched = point.clip.mark === "possible_match";
        return (
          <button
            key={point.clip.id}
            type="button"
            onClick={() => onSelect(point.clip.id)}
            title={cameraLabel(point.clip.cameraId)}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            className={`absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border font-mono text-[10px] transition ${
              active
                ? "node-hot z-10 h-12 w-12 border-[#5ee7ff] bg-[#5ee7ff] text-[#041018] shadow-[0_0_24px_rgba(94,231,255,0.65)]"
                : matched
                  ? "h-9 w-9 border-[#3dffb0] bg-[#3dffb0]/15 text-[#3dffb0]"
                  : "h-9 w-9 border-[#5ee7ff]/40 bg-[#071018]/80 text-[#9adff0] hover:border-[#5ee7ff]"
            }`}
          >
            {point.index + 1}
            <span className="sr-only">{cameraLabel(point.clip.cameraId)}</span>
          </button>
        );
      })}
    </div>
  );
}
