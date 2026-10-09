"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { hiddenNodeIds, retainedNodeIds } from "@/lib/graph-layout";
import { cameraLabel } from "@/lib/labels";
import type { Clip } from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const NODE_REL = 6;
const PADDING = 64;

export type NodeCall = "yes" | "no";

type NetNode = {
  id: string;
  label: string;
  order: number;
  score: number;
  tint: number;
  verdict: NodeCall | "";
  x?: number;
  y?: number;
};

type NetLink = {
  source: string;
  target: string;
};

type Hop = { from: string; to: string; t: number };

type GraphApi = {
  zoomToFit: (durationMs?: number, padding?: number) => void;
  d3Force: (name: string) => { strength?: (value: number) => void; distance?: (value: number) => void } | undefined;
  d3ReheatSimulation: () => void;
  screen2GraphCoords: (x: number, y: number) => { x: number; y: number };
};

export function ClipGraph({
  clips,
  activeId,
  calls,
  onSelect,
}: {
  clips: Clip[];
  activeId: string;
  calls: Record<string, NodeCall>;
  onSelect: (id: string) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<GraphApi | undefined>(undefined);
  const hopRef = useRef<Hop | null>(null);
  const previousId = useRef(activeId);
  const settled = useRef(false);
  const tuned = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fitted, setFitted] = useState(false);

  const visibleIds = clips.map((clip) => clip.id);
  const catalogRef = useRef(clips);
  const catalogIds = catalogRef.current.map((clip) => clip.id);
  const retainedIds = retainedNodeIds(catalogIds, visibleIds);
  if (!sameIds(retainedIds, catalogIds)) catalogRef.current = clips;
  const layoutKey = retainedIds.join("\0");
  // Clearing a clip hides that node. Rebuilding the graph restarts the force layout and blanks the canvas.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const graph = useMemo(() => buildGraph(catalogRef.current), [layoutKey]);
  const hidden = useMemo(() => new Set(hiddenNodeIds(retainedIds, visibleIds)), [layoutKey, visibleIds.join("\0")]);
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  const low = Math.min(...clips.map((clip) => clip.score));
  const high = Math.max(...clips.map((clip) => clip.score));
  for (const node of graph.nodes) {
    const clip = clips.find((item) => item.id === node.id);
    if (!clip) continue;
    node.score = clip.score;
    node.tint = scoreTint(clip.score, low, high);
    node.verdict = calls[clip.id] ?? (clip.mark === "possible_match" ? "yes" : clip.mark === "not_vehicle" ? "no" : "");
  }

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const next = { width: frame.clientWidth, height: frame.clientHeight };
      setSize((current) => (current.width === next.width && current.height === next.height ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    settled.current = false;
    tuned.current = false;
    setFitted(false);
  }, [layoutKey]);

  useEffect(() => {
    const from = previousId.current;
    previousId.current = activeId;
    if (!from || from === activeId) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 520);
      hopRef.current = { from, to: activeId, t: 1 - (1 - t) * (1 - t) };
      if (t < 1) frame = requestAnimationFrame(tick);
      else hopRef.current = null;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeId]);

  useEffect(() => {
    if (!settled.current || size.width < 20 || size.height < 20) return;
    graphRef.current?.zoomToFit(280, PADDING);
  }, [size]);

  useEffect(() => {
    const canvas = frameRef.current?.querySelector("canvas");
    const api = graphRef.current;
    if (!canvas || !api || !fitted) return;
    const pick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const point = api.screen2GraphCoords(event.clientX - rect.left, event.clientY - rect.top);
      let nearest: NetNode | undefined;
      let best = 16;
      for (const node of graph.nodes) {
        if (hiddenRef.current.has(node.id) || node.x == null || node.y == null) continue;
        const distance = Math.hypot(node.x - point.x, node.y - point.y);
        if (distance < best) {
          best = distance;
          nearest = node;
        }
      }
      if (nearest) onSelect(nearest.id);
    };
    canvas.addEventListener("click", pick);
    return () => canvas.removeEventListener("click", pick);
  }, [fitted, graph, onSelect]);

  const activeIndex = Math.max(0, clips.findIndex((clip) => clip.id === activeId));

  return (
    <div
      ref={frameRef}
      className="glass relative h-[24rem] overflow-hidden rounded-2xl lg:h-[calc(100dvh-14rem)]"
      role="group"
      aria-label={`Clip network, clip ${activeIndex + 1} of ${clips.length} selected`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(94,231,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(94,231,255,0.05)_1px,transparent_1px)] bg-[size:28px_28px]" />
      {size.width > 0 && size.height > 0 ? (
        <div className={fitted ? "h-full w-full" : "invisible h-full w-full"}>
          <ForceGraph2D
            ref={graphRef as never}
            graphData={graph}
            width={size.width}
            height={size.height}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={NODE_REL}
            nodeVisibility={(node) => !hiddenRef.current.has(String(node.id))}
            linkVisibility={(link) => {
              const source = endpoint(link.source);
              const target = endpoint(link.target);
              return !hiddenRef.current.has(source) && !hiddenRef.current.has(target);
            }}
            nodeVal={(node) => (node.id === activeId ? 3.2 : 1.45)}
            nodeColor={(node) => nodeFill(node.tint)}
            nodeLabel={(node) => `${node.order}. ${node.label} · ${Math.round(node.score * 100)}%`}
            linkColor={(link) => (linkIsHop(link, hopRef.current) ? "rgba(244,253,255,0.95)" : "rgba(94,231,255,0.32)")}
            linkWidth={(link) => (linkIsHop(link, hopRef.current) ? 2.4 : 1)}
            linkCurvature={0.18}
            autoPauseRedraw={false}
            enableNodeDrag={false}
            enablePanInteraction={false}
            nodePointerAreaPaint={(node, color, ctx) => {
              const radius = Math.sqrt(node.id === activeId ? 3.2 : 1.8) * NODE_REL + 6;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, Math.PI * 2);
              ctx.fill();
            }}
            minZoom={0.2}
            maxZoom={6}
            warmupTicks={70}
            cooldownTicks={90}
            cooldownTime={2500}
            d3AlphaDecay={0.06}
            d3VelocityDecay={0.4}
            onEngineTick={() => tuneForces(graphRef.current, tuned)}
            onEngineStop={() => {
              settled.current = true;
              graphRef.current?.zoomToFit(0, PADDING);
              setFitted(true);
            }}
            onNodeClick={(node) => {
              if (node.id) onSelect(String(node.id));
            }}
            onRenderFramePost={(ctx, scale) =>
              paintOverlay(ctx, scale, graph.nodes, activeId, hopRef.current, hiddenRef.current)
            }
          />
        </div>
      ) : null}
      <ul className="sr-only">
        {clips.map((clip, index) => (
          <li key={clip.id}>
            <button type="button" aria-current={clip.id === activeId ? "true" : undefined} onClick={() => onSelect(clip.id)}>
              {index + 1}. {cameraLabel(clip.cameraId)}, {Math.round(clip.score * 100)} percent
              {calls[clip.id] ? `, ${calls[clip.id]}` : ""}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function tuneForces(api: GraphApi | undefined, tuned: { current: boolean }) {
  if (!api || tuned.current) return;
  tuned.current = true;
  api.d3Force("charge")?.strength?.(-210);
  api.d3Force("link")?.distance?.(78);
  api.d3ReheatSimulation();
}

function buildGraph(clips: Clip[]) {
  const count = Math.max(clips.length, 1);
  const nodes: NetNode[] = clips.map((clip, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const ring = 70 + (index % 3) * 28;
    return {
      id: clip.id,
      label: cameraLabel(clip.cameraId),
      order: index + 1,
      score: clip.score,
      tint: 0.5,
      verdict: "",
      x: Math.cos(angle) * ring,
      y: Math.sin(angle) * ring,
    };
  });
  const links: NetLink[] = [];
  const seen = new Set<string>();
  const add = (a: string, b: string) => {
    if (!a || !b || a === b) return;
    const key = a < b ? `${a}\0${b}` : `${b}\0${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ source: a, target: b });
  };
  const byCamera = new Map<string, string[]>();
  clips.forEach((clip, index) => {
    const group = byCamera.get(clip.cameraId) ?? [];
    group.push(clip.id);
    byCamera.set(clip.cameraId, group);
    const next = clips[index + 1];
    if (next) add(clip.id, next.id);
    if (index % 5 === 0) add(clip.id, clips[(index + 8) % count]?.id ?? "");
  });
  for (const group of byCamera.values()) {
    for (let index = 1; index < group.length; index += 1) add(group[index - 1], group[index]);
  }
  return { nodes, links };
}

function scoreTint(score: number, low: number, high: number) {
  const span = high - low;
  if (span < 0.001) return 0.72;
  return Math.min(1, Math.max(0, (score - low) / span));
}

function nodeFill(tint: number) {
  const saturation = 16 + tint * 74;
  const lightness = 14 + tint * 34;
  return `hsl(188 ${saturation}% ${lightness}%)`;
}

function linkIsHop(link: { source?: unknown; target?: unknown }, hop: Hop | null) {
  if (!hop) return false;
  const source = endpoint(link.source);
  const target = endpoint(link.target);
  return (source === hop.from && target === hop.to) || (source === hop.to && target === hop.from);
}

function endpoint(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object" && "id" in value && value.id != null) return String(value.id);
  return "";
}

function drawCall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  scale: number,
  verdict: NodeCall,
) {
  const bx = x + radius * 0.78;
  const by = y - radius * 0.78;
  const badge = 5.4 / Math.max(scale, 0.45);
  ctx.beginPath();
  ctx.arc(bx, by, badge, 0, Math.PI * 2);
  ctx.fillStyle = verdict === "yes" ? "#0d2a22" : "#2a1214";
  ctx.fill();
  ctx.lineWidth = 1.15 / Math.max(scale, 0.45);
  ctx.strokeStyle = verdict === "yes" ? "#3dffb0" : "#e07a7a";
  ctx.stroke();
  ctx.beginPath();
  ctx.lineWidth = 1.35 / Math.max(scale, 0.45);
  ctx.lineCap = "round";
  if (verdict === "yes") {
    ctx.moveTo(bx - badge * 0.42, by + badge * 0.02);
    ctx.lineTo(bx - badge * 0.08, by + badge * 0.34);
    ctx.lineTo(bx + badge * 0.46, by - badge * 0.36);
  } else {
    const arm = badge * 0.36;
    ctx.moveTo(bx - arm, by - arm);
    ctx.lineTo(bx + arm, by + arm);
    ctx.moveTo(bx + arm, by - arm);
    ctx.lineTo(bx - arm, by + arm);
  }
  ctx.stroke();
  ctx.lineCap = "butt";
}

function sameIds(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function paintOverlay(
  ctx: CanvasRenderingContext2D,
  scale: number,
  nodes: NetNode[],
  activeId: string,
  hop: Hop | null,
  hidden: Set<string>,
) {
  for (const node of nodes) {
    if (hidden.has(node.id) || node.x == null || node.y == null) continue;
    const active = node.id === activeId;
    const radius = Math.sqrt(active ? 3.2 : 1.45) * NODE_REL;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.lineWidth = (active ? 1.6 : 1.1) / Math.max(scale, 0.4);
    ctx.strokeStyle = active ? "#f4fdff" : node.verdict === "yes" ? "#3dffb0" : node.verdict === "no" ? "#e07a7a" : "rgba(94,231,255,0.55)";
    ctx.stroke();
    if (active) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 5.5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(94,231,255,0.4)";
      ctx.lineWidth = 1.2 / Math.max(scale, 0.4);
      ctx.stroke();
    }
    if (node.verdict) drawCall(ctx, node.x, node.y, radius, scale, node.verdict);
    ctx.fillStyle = node.tint > 0.62 ? "#041018" : "#d7f6ff";
    ctx.font = `${(active ? 12 : 10) / Math.max(scale, 0.4)}px ui-monospace, SFMono-Regular, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(node.order), node.x, node.y + 0.5 / Math.max(scale, 0.4));
  }

  if (!hop) return;
  const from = nodes.find((node) => node.id === hop.from);
  const to = nodes.find((node) => node.id === hop.to);
  if (!from || !to || from.x == null || from.y == null || to.x == null || to.y == null) return;
  const x = from.x + (to.x - from.x) * hop.t;
  const y = from.y + (to.y - from.y) * hop.t;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(94,231,255,0.28)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = "#f4fdff";
  ctx.fill();
}
