import { NextResponse } from "next/server";
import { latestNewYorkClip } from "@/lib/vss";

export const maxDuration = 60;

export async function GET() {
  try {
    const clip = await latestNewYorkClip();
    return NextResponse.json({ clip });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the latest clip.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
