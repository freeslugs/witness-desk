import type { City, Clip, LatestClip } from "./types";

type SearchHit = {
  camera_id?: string;
  source?: string;
  reasoning_content?: string;
  similarity_score?: number;
  segment_start_sec?: number;
  segment_end_sec?: number;
};

let cachedToken = "";
let tokenUntil = 0;

function backend() {
  return (process.env.VSS_BACKEND || "https://team-33-vss.thecosmoslabs.com").replace(/\/$/, "");
}

function headers(token?: string) {
  const h: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function getToken() {
  if (cachedToken && Date.now() < tokenUntil) return cachedToken;
  const username = process.env.VSS_USERNAME;
  const password = process.env.VSS_PASSWORD;
  if (!username || !password) {
    throw new Error("Video search login is not configured.");
  }
  const response = await fetch(`${backend()}/api/v1/auth/login`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Could not sign in to the video archive.");
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("The video archive did not return a session.");
  cachedToken = data.access_token;
  tokenUntil = Date.now() + 20 * 60 * 1000;
  return cachedToken;
}

export async function latestNewYorkClip(): Promise<LatestClip | null> {
  const token = await getToken();
  const response = await fetch(
    `${backend()}/api/v1/videos/explore?scope=all&location=new_york&limit=48`,
    { headers: headers(token), cache: "no-store" },
  );
  if (!response.ok) throw new Error("Could not load the latest New York clip.");
  const data = (await response.json()) as {
    chunks?: Array<{
      camera_id?: string;
      preview_source?: string;
      reasoning_content?: string;
      filename?: string;
      upload_timestamp?: string;
      location?: string;
    }>;
  };
  const chunks = (data.chunks ?? []).filter((chunk) => chunk.location === "new_york" && chunk.preview_source);
  chunks.sort((a, b) => (b.upload_timestamp ?? "").localeCompare(a.upload_timestamp ?? ""));
  const clip = chunks[0];
  if (!clip?.preview_source) return null;
  return {
    cameraId: clip.camera_id ?? "",
    source: clip.preview_source,
    caption: clip.reasoning_content ?? "",
    filename: clip.filename ?? "",
    uploadedAt: clip.upload_timestamp ?? "",
  };
}

const CITY_ZONE: Record<City, string> = {
  new_york: "America/New_York",
  san_francisco: "America/Los_Angeles",
};

export function searchWindow(location: City, date: string, startTime = "", endTime = "") {
  const zone = CITY_ZONE[location];
  const start = zonedToUtc(date, startTime || "00:00", zone);
  const end = endTime ? zonedToUtc(date, endTime, zone) : zonedToUtc(nextDate(date), "00:00", zone);
  return { start, end };
}

function nextDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function zonedToUtc(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = zoneOffset(guess, timeZone);
  return new Date(guess - offset).toISOString().replace(".000Z", "Z");
}

function zoneOffset(utcMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const zoned = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour"), read("minute"), read("second"));
  return zoned - utcMs;
}

export async function searchVehicles(
  query: string,
  location: City,
  window: { start: string; end: string } | null,
): Promise<Clip[]> {
  const token = await getToken();
  const body: Record<string, unknown> = {
    query,
    top_k: 36,
    llm_top_n: 1,
    min_similarity: 0.2,
    time_filter: window ? "custom" : "all",
    metadata_filters: { location },
  };
  if (window) {
    body.custom_start_date = window.start;
    body.custom_end_date = window.end;
  }
  const response = await fetch(`${backend()}/api/v1/search`, {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("The video search did not complete.");
  const data = (await response.json()) as { results?: SearchHit[] };
  return (data.results ?? [])
    .filter((hit) => hit.source)
    .map((hit) => ({
      id: crypto.randomUUID(),
      cameraId: hit.camera_id ?? "",
      source: hit.source ?? "",
      caption: (hit.reasoning_content ?? "").trim(),
      score: hit.similarity_score ?? 0,
      startSec: hit.segment_start_sec ?? 0,
      endSec: hit.segment_end_sec ?? 0,
      mark: "" as const,
    }));
}

export async function detectionPayload(source: string) {
  const token = await getToken();
  const url = new URL(`${backend()}/api/v1/videos/detections`);
  url.searchParams.set("source", source);
  const response = await fetch(url, { headers: headers(token), cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not load detections for this clip.");
  return response.json() as Promise<unknown>;
}

export async function openStream(source: string, range: string | null) {
  const token = await getToken();
  const url = new URL(`${backend()}/api/v1/videos/stream`);
  url.searchParams.set("source", source);
  url.searchParams.set("token", token);
  const upstreamHeaders: Record<string, string> = { "User-Agent": "Mozilla/5.0" };
  if (range) upstreamHeaders.Range = range;
  return fetch(url, { headers: upstreamHeaders, cache: "no-store" });
}
