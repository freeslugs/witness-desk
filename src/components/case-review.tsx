"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ClipGraph } from "@/components/clip-graph";
import { DeskBar } from "@/components/ui";
import { saveCase } from "@/lib/cases";
import { cameraLabel, cityLabel, displayWhen, vehicleLabel } from "@/lib/labels";
import type { CaseRecord } from "@/lib/types";

export function CaseReview({ initial }: { initial: CaseRecord }) {
  const [record, setRecord] = useState(initial);
  const [activeId, setActiveId] = useState(() => firstOpen(initial));
  const [frameNote, setFrameNote] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const open = useMemo(() => record.clips.filter((clip) => clip.mark !== "not_vehicle"), [record.clips]);
  const active = open.find((clip) => clip.id === activeId) ?? open[0] ?? null;
  const reviewed = record.clips.length - open.length;
  const activeSource = active?.source ?? "";

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource) return;
    const next = `/api/stream?source=${encodeURIComponent(activeSource)}`;
    if (video.dataset.clip === activeSource) return;
    video.dataset.clip = activeSource;
    video.src = next;
    void video.play().catch(() => undefined);
  }, [activeSource]);

  function commit(next: CaseRecord) {
    setRecord(next);
    saveCase(next);
  }

  function reject() {
    if (!active) return;
    const id = active.id;
    const index = open.findIndex((clip) => clip.id === id);
    const following = open[index + 1] ?? open[index - 1];
    setActiveId(following && following.id !== id ? following.id : "");
    setRecord((current) => {
      const clips = current.clips.map((clip) => (clip.id === id ? { ...clip, mark: "not_vehicle" as const } : clip));
      const remaining = clips.some((clip) => clip.mark !== "not_vehicle");
      const next = { ...current, clips, status: remaining ? current.status ?? "open" : "closed" };
      saveCase(next);
      return next;
    });
  }

  async function confirm() {
    if (!active) return;
    const still = await grabFrame(videoRef.current);
    const clips = record.clips.map((clip) =>
      clip.id === active.id ? { ...clip, mark: "possible_match" as const } : clip,
    );
    commit({ ...record, clips, still: still || record.still, saved: true, status: "closed" });
    setFrameNote(still ? "" : "Play the clip for a moment, then press Yes again to grab the frame.");
  }

  return (
    <div className="min-h-full text-ink">
      <DeskBar
        action={
          <Link href="/new" className="font-mono text-[11px] uppercase tracking-[0.16em] text-navy">
            New case
          </Link>
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
                      className="aspect-video w-full bg-black"
                      controls
                      playsInline
                      muted
                      preload="auto"
                      aria-label="Clip under review"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void confirm()}
                      className="action rounded-md px-6 py-3 text-sm font-semibold transition"
                    >
                      Yes, this is it
                    </button>
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
                  <h2 className="text-2xl font-semibold tracking-tight">Every clip is cleared.</h2>
                  <p className="mt-2 text-muted">Start a new search if the vehicle was not in this set.</p>
                </div>
              )}
            </section>

            <aside className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              {record.still ? (
                <div className="rise-in glass overflow-hidden rounded-2xl">
                  <img src={record.still} alt="Still of the confirmed vehicle" className="aspect-video w-full object-cover" />
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold">Frame kept with this case</p>
                      <p className="text-sm text-muted">The still from the clip you confirmed.</p>
                    </div>
                    <div className="flex gap-2">
                      <Mark
                        on={record.stolen}
                        label="Stolen"
                        onClick={() => commit({ ...record, stolen: !record.stolen, saved: true })}
                      />
                      <Mark
                        on={record.hitAndRun}
                        label="Hit and run"
                        onClick={() => commit({ ...record, hitAndRun: !record.hitAndRun, saved: true })}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              {open.length > 0 ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-navy">Network</p>
                    <p className="font-mono text-[11px] text-muted">{open.length} live</p>
                  </div>
                  <ClipGraph clips={open} activeId={active?.id ?? ""} onSelect={setActiveId} />
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

function firstOpen(record: CaseRecord) {
  return record.clips.find((clip) => clip.mark !== "not_vehicle")?.id ?? record.clips[0]?.id ?? "";
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
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return "";
    context.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return "";
  }
}
