import { NextResponse } from "next/server";
import { vehicleBoxAtTime, type DetectionPayload } from "@/lib/vehicle-box";
import { detectionPayload } from "@/lib/vss";

export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  const time = Number(url.searchParams.get("time") ?? "0");
  if (!source) return NextResponse.json({ error: "Missing clip." }, { status: 400 });
  if (!Number.isFinite(time)) return NextResponse.json({ error: "Missing frame time." }, { status: 400 });
  try {
    const payload = await detectionPayload(source);
    const box = payload ? vehicleBoxAtTime(payload as DetectionPayload, time) : null;
    return NextResponse.json({ box });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load detections.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
