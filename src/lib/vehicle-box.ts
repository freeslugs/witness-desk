export type NormBox = { x: number; y: number; w: number; h: number };

export type View = { scale: number; x: number; y: number };

const VEHICLES = new Set(["car", "truck", "bus", "motorcycle"]);

type Detection = { label?: string; bbox?: number[] };
type Frame = { time_sec?: number; shape?: number[]; detections?: Detection[] };

export type DetectionPayload = {
  video_shape?: number[];
  frames?: Frame[];
};

export function vehicleBoxAtTime(payload: DetectionPayload, timeSec: number): NormBox | null {
  const frames = payload.frames ?? [];
  if (frames.length === 0) return null;
  let nearest = frames[0];
  let nearestDistance = Infinity;
  for (const frame of frames) {
    const distance = Math.abs((frame.time_sec ?? 0) - timeSec);
    if (distance < nearestDistance) {
      nearest = frame;
      nearestDistance = distance;
    }
  }
  const shape = nearest.shape ?? payload.video_shape ?? [];
  const height = shape[0] ?? 0;
  const width = shape[1] ?? 0;
  if (width <= 0 || height <= 0) return null;

  let chosen: NormBox | null = null;
  let chosenArea = 0;
  for (const detection of nearest.detections ?? []) {
    if (!detection.label || !VEHICLES.has(detection.label)) continue;
    const bbox = detection.bbox;
    if (!bbox || bbox.length < 4) continue;
    const [x1, y1, x2, y2] = bbox;
    const box = {
      x: x1 / width,
      y: y1 / height,
      w: (x2 - x1) / width,
      h: (y2 - y1) / height,
    };
    if (box.w <= 0.02 || box.h <= 0.02) continue;
    const area = box.w * box.h;
    if (area > chosenArea) {
      chosen = box;
      chosenArea = area;
    }
  }
  return chosen;
}

export function clampView(view: View, width: number, height: number): View {
  const scale = Math.min(8, Math.max(1, view.scale));
  const minX = width - width * scale;
  const minY = height - height * scale;
  return {
    scale,
    x: Math.min(0, Math.max(minX, view.x)),
    y: Math.min(0, Math.max(minY, view.y)),
  };
}

export function fitView(box: NormBox | null | undefined, width: number, height: number): View {
  if (!box || width < 1 || height < 1 || box.w <= 0 || box.h <= 0) return { scale: 1, x: 0, y: 0 };
  const scale = Math.min(8, Math.max(1, Math.min(1 / (box.w * 1.45), 1 / (box.h * 1.45))));
  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;
  return clampView(
    {
      scale,
      x: width / 2 - centerX * width * scale,
      y: height / 2 - centerY * height * scale,
    },
    width,
    height,
  );
}
