"use client";

import { useEffect, useRef } from "react";

export const NODE_COUNT = 46;

const WORLD_W = 1120;
const WORLD_H = 740;
/** Cool cyan HUD tones — Minority Report glass, not carnival LEDs. */
const PALETTE = ["#5ee7ff", "#7aa2ff", "#3d9ecf", "#9ad8ef", "#4ec4e8", "#6eb8d9", "#88c8e6", "#5ba3c9"];

type Dot = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  phase: number;
};

type Spark = {
  from: number;
  to: number;
  t0: number;
  dur: number;
  color: string;
  handed: boolean;
};

export function ClipField({
  gone,
  scanning = false,
  flare = false,
}: {
  gone: Set<number>;
  scanning?: boolean;
  flare?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const goneRef = useRef(gone);
  const scanningRef = useRef(scanning);
  const flareRef = useRef(flare);
  goneRef.current = gone;
  scanningRef.current = scanning;
  flareRef.current = flare;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const nodes = seedNodes();
    const sparks: Spark[] = [];
    let nextSpawn = 0;
    let frame = 0;
    let last = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width * ratio);
      canvas.height = Math.max(1, rect.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const tick = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      if (!reduced) {
        drift(nodes, now, dt, scanningRef.current);
        if (now >= nextSpawn) {
          launch(nodes, sparks, goneRef.current, now);
          if (Math.random() < 0.28) launch(nodes, sparks, goneRef.current, now);
          nextSpawn = now + (scanningRef.current ? 220 : 420) + Math.random() * 520;
        }
        handOff(nodes, sparks, goneRef.current, now);
      }

      paintSparks(context, nodes, sparks, goneRef.current, now, width, height);
      paintNodes(context, nodes, sparks, goneRef.current, now, width, height, scanningRef.current, flareRef.current);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}

function seedNodes() {
  const nodes: Dot[] = [];
  for (let id = 0; id < NODE_COUNT; id += 1) {
    let x = 80;
    let y = 80;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      x = 64 + Math.random() * (WORLD_W - 128);
      y = 52 + Math.random() * (WORLD_H - 104);
      const clear = nodes.every((node) => Math.hypot(node.x - x, node.y - y) > 78);
      if (clear) break;
    }
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.08 + Math.random() * 0.18;
    nodes.push({
      id,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: PALETTE[id % PALETTE.length],
      phase: Math.random() * Math.PI * 2,
    });
  }
  return nodes;
}

function drift(nodes: Dot[], now: number, dt: number, scanning: boolean) {
  const step = dt / 16;
  const kick = scanning ? 1.25 : 1;
  for (const node of nodes) {
    node.vx += Math.sin(now * 0.00045 + node.phase) * 0.012 * kick;
    node.vy += Math.cos(now * 0.00038 + node.phase * 1.6) * 0.012 * kick;
    const turn = Math.sin(now * 0.00018 + node.phase) * 0.012 * kick;
    const cosine = Math.cos(turn);
    const sine = Math.sin(turn);
    const vx = node.vx * cosine - node.vy * sine;
    const vy = node.vx * sine + node.vy * cosine;
    node.vx = vx;
    node.vy = vy;
    if (Math.random() < 0.004) {
      node.vx += (Math.random() - 0.5) * 0.35;
      node.vy += (Math.random() - 0.5) * 0.35;
    }
    const speed = Math.hypot(node.vx, node.vy);
    const max = scanning ? 0.72 : 0.42;
    if (speed > max) {
      node.vx = (node.vx / speed) * max;
      node.vy = (node.vy / speed) * max;
    }
    node.vx *= 0.992;
    node.vy *= 0.992;
    node.x += node.vx * step;
    node.y += node.vy * step;
    if (node.x < 48) node.vx += 0.035;
    if (node.x > WORLD_W - 48) node.vx -= 0.035;
    if (node.y < 40) node.vy += 0.035;
    if (node.y > WORLD_H - 40) node.vy -= 0.035;
    node.x = Math.max(36, Math.min(WORLD_W - 36, node.x));
    node.y = Math.max(32, Math.min(WORLD_H - 32, node.y));
  }
}

function launch(nodes: Dot[], sparks: Spark[], gone: Set<number>, now: number, fromId?: number, color?: string) {
  if (sparks.length > 14) return;
  const live = nodes.filter((node) => !gone.has(node.id));
  if (live.length < 2) return;
  const origin = fromId == null ? live[Math.floor(Math.random() * live.length)] : nodes[fromId];
  if (!origin || gone.has(origin.id)) return;
  const near = live
    .filter((node) => node.id !== origin.id)
    .map((node) => ({ node, distance: Math.hypot(node.x - origin.x, node.y - origin.y) }))
    .filter((item) => item.distance > 36 && item.distance < 320)
    .sort((a, b) => a.distance - b.distance);
  if (near.length === 0) return;
  const pool = Math.random() < 0.72 ? near.slice(0, Math.min(5, near.length)) : near;
  const target = pool[Math.floor(Math.random() * pool.length)];
  sparks.push({
    from: origin.id,
    to: target.node.id,
    t0: now,
    dur: 1100 + Math.random() * 1200,
    color: color ?? (Math.random() < 0.5 ? origin.color : target.node.color),
    handed: false,
  });
}

function handOff(nodes: Dot[], sparks: Spark[], gone: Set<number>, now: number) {
  for (const spark of sparks) {
    if (spark.handed) continue;
    const age = (now - spark.t0) / spark.dur;
    if (age < 0.58 || age > 0.72) continue;
    spark.handed = true;
    if (Math.random() < 0.42) launch(nodes, sparks, gone, now, spark.to, spark.color);
  }
}

function paintSparks(
  context: CanvasRenderingContext2D,
  nodes: Dot[],
  sparks: Spark[],
  gone: Set<number>,
  now: number,
  width: number,
  height: number,
) {
  for (let index = sparks.length - 1; index >= 0; index -= 1) {
    const spark = sparks[index];
    const age = (now - spark.t0) / spark.dur;
    const from = nodes[spark.from];
    const to = nodes[spark.to];
    if (age >= 1 || !from || !to || gone.has(from.id) || gone.has(to.id)) {
      sparks.splice(index, 1);
      continue;
    }
    const grow = Math.min(1, age / 0.42);
    const fade = age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3;
    const start = place(from.x, from.y, width, height);
    const end = place(to.x, to.y, width, height);
    const x = start.x + (end.x - start.x) * grow;
    const y = start.y + (end.y - start.y) * grow;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(x, y);
    context.strokeStyle = withAlpha(spark.color, 0.38 * fade);
    context.lineWidth = 1.15;
    context.stroke();
    context.beginPath();
    context.arc(x, y, 2.4, 0, Math.PI * 2);
    context.fillStyle = withAlpha("#d7f0fa", 0.72 * fade);
    context.fill();
  }
}

function paintNodes(
  context: CanvasRenderingContext2D,
  nodes: Dot[],
  sparks: Spark[],
  gone: Set<number>,
  now: number,
  width: number,
  height: number,
  scanning: boolean,
  flare: boolean,
) {
  const hotIds = new Set<number>();
  for (const spark of sparks) {
    const age = (now - spark.t0) / spark.dur;
    if (age > 0.25) hotIds.add(spark.to);
    if (age < 0.35) hotIds.add(spark.from);
  }
  for (const node of nodes) {
    const live = !gone.has(node.id);
    const hot = live && (scanning || flare || hotIds.has(node.id));
    const point = place(node.x, node.y, width, height);
    const pulse = 0.9 + Math.sin(now * 0.0012 + node.phase) * 0.1;
    const radius = live ? (hot ? 4.6 : 3.6) * pulse : 2.1;
    if (live) {
      context.beginPath();
      context.arc(point.x, point.y, hot ? 13 : 10, 0, Math.PI * 2);
      context.strokeStyle = withAlpha(node.color, hot ? 0.32 : 0.16);
      context.lineWidth = 1;
      context.stroke();
    }
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fillStyle = live ? (flare ? "#e8f7fc" : node.color) : "#122636";
    context.shadowColor = live ? node.color : "transparent";
    context.shadowBlur = live ? (hot ? 10 : 6) : 0;
    context.fill();
    context.shadowBlur = 0;
  }
}

function place(x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / WORLD_W, height / WORLD_H);
  return {
    x: (width - WORLD_W * scale) / 2 + x * scale,
    y: (height - WORLD_H * scale) / 2 + y * scale,
  };
}

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
