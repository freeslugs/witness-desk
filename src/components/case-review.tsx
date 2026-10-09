"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ClipGraph, type NodeCall } from "@/components/clip-graph";
import { FrameLoupe } from "@/components/frame-loupe";
import { DeskBar } from "@/components/ui";
import { saveCase } from "@/lib/cases";
import { cameraLabel, cityLabel, displayWhen, vehicleLabel } from "@/lib/labels";
import type { CaseRecord } from "@/lib/types";
import type { NormBox } from "@/lib/vehicle-box";

export function CaseReview({ initial }: { initial: CaseRecord }) {
  const router = useRouter();
  const [record, setRecord] = useState(initial);
  const [activeId, setActiveId] = useState(() => firstOpen(initial));
  const [visitCalls, setVisitCalls] = useState<Record<string, NodeCall>>({});
  const [inspecting, setInspecting] = useState(Boolean(initial.still));
  const [frameNote, setFrameNote] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const open = useMemo(() => record.clips.filter((clip) => clip.mark !== "not_vehicle"), [record.clips]);
  const clipsRef = useRef(record.clips);
  clipsRef.current = record.clips;
  const cutoff = useMemo(() => median(record.clips.map((clip) => clip.score)), [record.clips]);
  const cutoffRef = useRef(cutoff);
  cutoffRef.current = cutoff;
  const calls = useMemo(() => {
    const next = { ...visitCalls };
    for (const clip of record.clips) {
      if (clip.mark === "possible_match") next[clip.id] = "yes";
      if (clip.mark === "not_vehicle") next[clip.id] = "no";
    }
    return next;
  }, [record.clips, visitCalls]);
  const active = record.clips.find((clip) => clip.id === activeId) ?? null;
  const reviewed = record.clips.length - open.length;
  const activeSource = active?.source ?? "";

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource) return;
    const next = `/api/stream?source=${encodeURIComponent(activeSource)}`;
    if (video.dataset.clip === activeSource) return;
    video.dataset.clip = activeSource;
    video.loop = false;
    video.src = next;
    void video.play().catch(() => undefined);
  }, [activeSource]);

  const previousActive = useRef(activeId);
  useEffect(() => {
    const leaving = previousActive.current;
    previousActive.current = activeId;
    if (!leaving || leaving === activeId) return;
    stampLeaving(leaving);
  }, [activeId]);

  function stampLeaving(id: string) {
    setVisitCalls((current) => {
      if (current[id]) return current;
      const clip = clipsRef.current.find((item) => item.id === id);
      if (!clip || clip.mark) return current;
      return { ...current, [id]: clip.score >= cutoffRef.current ? "yes" : "no" };
    });
  }

  function selectNode(id: string) {
    setInspecting(false);
    setActiveId(id);
  }

  function commit(next: CaseRecord) {
    const stamped = saveCase(next);
    setRecord(stamped);
    return stamped;
  }

  function reject() {
    if (!active) return;
    const id = active.id;
    const index = record.clips.findIndex((clip) => clip.id === id);
    const following = record.clips.slice(index + 1).find((clip) => clip.mark !== "not_vehicle");
    setActiveId(following?.id ?? "");
    setRecord((current) => {
      const clips = current.clips.map((clip) => (clip.id === id ? { ...clip, mark: "not_vehicle" as const } : clip));
      const remaining = clips.some((clip) => clip.mark !== "not_vehicle");
      const next = { ...current, clips, status: remaining ? current.status ?? "open" : "closed" };
      try {
        return saveCase(next);
      } catch {
        return next;
      }
    });
  }

  async function confirm() {
    if (!active) return;
    const video = videoRef.current;
    video?.pause();
    const time = video?.currentTime ?? 0;
    const still = await grabFrame(video);
    const vehicleBox = still ? await readVehicleBox(active.source, time) : record.vehicleBox ?? null;
    const clips = record.clips.map((clip) =>
      clip.id === active.id ? { ...clip, mark: "possible_match" as const } : clip,
    );
    try {
      commit({
        ...record,
        clips,
        still: still || record.still,
        vehicleBox,
        saved: true,
        status: "closed",
      });
    } catch {
      setFrameNote("Could not keep this still on the desk. Try File case again, or clear old cases.");
      setRecord({
        ...record,
        clips,
        still: still || record.still,
        vehicleBox,
        saved: true,
        status: "closed",
      });
      if (still) setInspecting(true);
      return;
    }
    if (still) setInspecting(true);
    setFrameNote(still ? "" : "Play the clip for a moment, then press Yes again to grab the frame.");
  }

  function fileCase() {
    try {
      commit({ ...record, saved: true, status: "closed" });
    } catch {
      setFrameNote("Could not file this case on the desk. Clear older cases, then try again.");
      return;
    }
    router.push("/cases");
  }

  return (
    <div className="min-h-full text-ink">
      <DeskBar
        action={
          <div className="flex items-center gap-5">
            <Link href="/cases" className="font-mono text-[11px] uppercase tracking-[0.16em] text-navy">
              Cases
            </Link>
            <Link href="/new" className="font-mono text-[11px] uppercase tracking-[0.16em] text-navy">
              New case
            </Link>
          </div>
        }
      />
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <div className="chip-in glass mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-4 py-3 text-sm">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{record.id.slice(0, 8)}</span>
          <span className="font-semibold">{cityLabel(record.location)}</span>
          <span className="capitalize text-muted">
            {record.color} {vehicleLabel(record.vehicleType)}
          </span>
          <span className="text-muted">{displayWhen(record.timeLabel, record.caseDate)}</span>
          <span className="font-mono text-xs text-navy sm:ml-auto">
            {open.length} left of {record.clips.length}
          </span>
        </div>

        {record.clips.length === 0 ? (
          <p className="glass rounded-2xl p-8 text-muted">No nodes came back for that description.</p>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <section>
              {active ? (
                <div>
                  <div className="relative overflow-hidden rounded-2xl border border-[#5ee7ff]/25 bg-black shadow-[0_0_40px_rgba(40,140,200,0.16)]">
                    <span className="pointer-events-none absolute left-2 top-2 z-10 h-4 w-4 border-l border-t border-navy" />
                    <span className="pointer-events-none absolute right-2 top-2 z-10 h-4 w-4 border-r border-t border-navy" />
                    <span className="pointer-events-none absolute bottom-2 left-2 z-10 h-4 w-4 border-b border-l border-navy" />
                    <span className="pointer-events-none absolute bottom-2 right-2 z-10 h-4 w-4 border-b border-r border-navy" />
                    <div className="flex items-center justify-between border-b border-[#5ee7ff]/15 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#9adff0]">
                      <span>{active ? cameraLabel(active.cameraId) : "Camera"}</span>
                      <span>{active ? `${Math.round(active.startSec)}s–${Math.round(active.endSec)}s` : ""}</span>
                    </div>
                    <video
                      ref={videoRef}
                      className={`aspect-video w-full bg-black ${inspecting && record.still ? "hidden" : ""}`}
                      controls
                      playsInline
                      muted
                      preload="auto"
                      aria-label="Clip under review"
                    />
                    {inspecting && record.still ? <FrameLoupe src={record.still} box={record.vehicleBox} /> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {inspecting && record.still ? (
                      <button
                        type="button"
                        onClick={() => setInspecting(false)}
                        className="rounded-md border border-line bg-panel px-6 py-3 text-sm font-semibold transition hover:border-white/30"
                      >
                        Watch the clip
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void confirm()}
                        className="action rounded-md px-6 py-3 text-sm font-semibold transition"
                      >
                        Yes, this is it
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={reject}
                      className="rounded-md border border-line bg-panel px-6 py-3 text-sm font-semibold transition hover:border-white/30"
                    >
                      No
                    </button>
                    <p className="font-mono text-xs text-muted">
                      {reviewed} cleared · {open.length} left
                    </p>
                  </div>
                  {frameNote ? <p className="mt-3 text-sm text-muted">{frameNote}</p> : null}
                </div>
              ) : (
                <div className="glass rounded-2xl p-8">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {open.length === 0 ? "Every clip is cleared." : "That's the last clip in this pass."}
                  </h2>
                  <p className="mt-2 text-muted">
                    {open.length === 0
                      ? "Start a new search if the vehicle was not in this set."
                      : "Pick another node to keep watching."}
                  </p>
                </div>
              )}
            </section>

            <aside className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              {record.still ? (
                <form
                  className="rise-in glass space-y-4 rounded-2xl p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    fileCase();
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold">Read the plate</p>
                    <p className="mt-1 text-sm text-muted">Zoom the frame and type what you can see. A muddy frame can still be filed.</p>
                  </div>
                  <label className="block">
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Plate</span>
                    <input
                      value={record.plate ?? ""}
                      onChange={(event) => {
                        const next = { ...record, plate: event.target.value.toUpperCase(), saved: true };
                        setRecord(next);
                        try {
                          saveCase(next);
                        } catch {
                          /* keep typing; File case retries a leaner write */
                        }
                      }}
                      className="mt-1 w-full rounded-xl border border-line bg-black/30 px-3 py-3 font-mono text-lg uppercase tracking-[0.18em]"
                      placeholder="ABC1234"
                      autoComplete="off"
                      spellCheck={false}
                      aria-label="License plate"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Note</span>
                    <textarea
                      value={record.note ?? ""}
                      onChange={(event) => {
                        const next = { ...record, note: event.target.value, saved: true };
                        setRecord(next);
                        try {
                          saveCase(next);
                        } catch {
                          /* keep typing; File case retries a leaner write */
                        }
                      }}
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-line bg-black/30 px-3 py-3 text-sm"
                      placeholder="Damage, direction, anything else"
                      aria-label="Case note"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Mark
                      on={record.stolen}
                      label="Stolen"
                      onClick={() => {
                        try {
                          commit({ ...record, stolen: !record.stolen, saved: true });
                        } catch {
                          setRecord({ ...record, stolen: !record.stolen, saved: true });
                        }
                      }}
                    />
                    <Mark
                      on={record.hitAndRun}
                      label="Hit and run"
                      onClick={() => {
                        try {
                          commit({ ...record, hitAndRun: !record.hitAndRun, saved: true });
                        } catch {
                          setRecord({ ...record, hitAndRun: !record.hitAndRun, saved: true });
                        }
                      }}
                    />
                  </div>
                  <button type="submit" className="action w-full rounded-md px-4 py-3 text-sm font-semibold">
                    File case
                  </button>
                  {frameNote ? <p className="text-sm text-muted">{frameNote}</p> : null}
                </form>
              ) : null}
              {record.clips.length > 0 ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-navy">Network</p>
                    <p className="font-mono text-[11px] text-muted">{open.length} live</p>
                  </div>
                  <ClipGraph clips={record.clips} activeId={active?.id ?? ""} calls={calls} onSelect={selectNode} />
                  <p className="mt-2 font-mono text-[11px] text-muted">Brighter nodes scored higher. A check or an x is the call after a visit.</p>
                </div>
              ) : null}
            </aside>
            {active ? (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                  {cameraLabel(active.cameraId)} · {Math.round(active.startSec)}s–{Math.round(active.endSec)}s
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink">{active.caption || "No caption for this clip."}</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Mark({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${on ? "border-[#e07a7a]/50 text-[#e07a7a]" : "border-line text-muted"}`}
    >
      {label}
    </button>
  );
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function firstOpen(record: CaseRecord) {
  return record.clips.find((clip) => clip.mark !== "not_vehicle")?.id ?? record.clips[0]?.id ?? "";
}

async function readVehicleBox(source: string, time: number): Promise<NormBox | null> {
  try {
    const response = await fetch(`/api/detections?source=${encodeURIComponent(source)}&time=${encodeURIComponent(String(time))}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { box?: NormBox | null };
    return data.box ?? null;
  } catch {
    return null;
  }
}

async function grabFrame(video: HTMLVideoElement | null) {
  if (!video) return "";
  try {
    if (video.readyState < 2) {
      await new Promise<void>((resolve) => video.addEventListener("loadeddata", () => resolve(), { once: true }));
    }
    if (video.currentTime < 0.15 && video.duration) {
      video.currentTime = Math.min(1, video.duration / 2);
      await new Promise<void>((resolve) => video.addEventListener("seeked", () => resolve(), { once: true }));
    }
    if (!video.videoWidth) return "";
    // Keep stills small enough for browser localStorage (~5MB shared).
    const maxWidth = 960;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return "";
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return "";
  }
}
