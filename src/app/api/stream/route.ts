import { openStream } from "@/lib/vss";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("source");
  if (!source) return new Response("Missing clip.", { status: 400 });
  try {
    const upstream = await openStream(source, request.headers.get("range"));
    const headers = new Headers();
    for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (!headers.get("content-type") || headers.get("content-type") === "binary/octet-stream") {
      headers.set("content-type", "video/mp4");
    }
    headers.set("cache-control", "private, no-store");
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return new Response("Could not play this clip.", { status: 502 });
  }
}
