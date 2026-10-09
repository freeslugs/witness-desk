import { NextResponse } from "next/server";
import { isCity, isVehicleType } from "@/lib/types";
import { searchVehicles, searchWindow } from "@/lib/vss";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    color?: string;
    vehicleType?: string;
    location?: string;
    knownTime?: boolean;
    caseDate?: string;
    startTime?: string;
    endTime?: string;
  };
  const color = (body.color ?? "").trim();
  const vehicleType = body.vehicleType ?? "";
  const location = body.location ?? "";
  const knownTime = body.knownTime === true;
  const caseDate = body.caseDate ?? "";
  const startTime = body.startTime ?? "";
  const endTime = body.endTime ?? "";
  const clock = /^\d{2}:\d{2}$/;
  if (!color || !isVehicleType(vehicleType) || !isCity(location)) {
    return NextResponse.json({ error: "Add a city, a color, and a vehicle type." }, { status: 400 });
  }
  if (knownTime && !/^\d{4}-\d{2}-\d{2}$/.test(caseDate)) {
    return NextResponse.json({ error: "Pick a date, or choose I don't know." }, { status: 400 });
  }
  if ((startTime && !clock.test(startTime)) || (endTime && !clock.test(endTime)) || Boolean(startTime) !== Boolean(endTime)) {
    return NextResponse.json({ error: "Add both a start and an end time, or leave both empty." }, { status: 400 });
  }
  if (startTime && endTime && endTime <= startTime) {
    return NextResponse.json({ error: "The end time has to be later than the start." }, { status: 400 });
  }
  try {
    const clips = await searchVehicles(
      `${color} ${vehicleType}`,
      location,
      knownTime ? searchWindow(location, caseDate, startTime, endTime) : null,
    );
    return NextResponse.json({
      clips,
      query: `${color} ${vehicleType}`.replace(/\s+/g, " ").trim(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
