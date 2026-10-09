"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeskBar } from "@/components/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { ClipField, NODE_COUNT } from "@/components/clip-field";
import { saveCase } from "@/lib/cases";
import { cityLabel, DAY_PARTS, vehicleLabel, whenPartLabel, type DayPart } from "@/lib/labels";
import { CITIES, VEHICLE_TYPES, type CaseRecord, type City, type VehicleType } from "@/lib/types";

const COLORS = ["yellow", "white", "black", "silver", "blue", "red"];
const CITY_DATE: Record<City, string> = {
  new_york: "2026-10-08",
  san_francisco: "2026-10-01",
};

const ARCHIVE_HINT: Record<City, string> = {
  new_york: "Indexed New York footage is mostly October 8, 2026.",
  san_francisco: "Indexed San Francisco footage is October 1 and October 6, 2026.",
};

type WhenFilter =
  | { known: false }
  | { known: true; date: string; start: string; end: string; part: DayPart };

type Step = "city" | "when" | "vehicle" | "color" | "searching";

export function Finder() {
  const router = useRouter();
  const navigateTimer = useRef<number | null>(null);
  const [step, setStep] = useState<Step>("city");
  const [city, setCity] = useState<City | "">("");
  const [when, setWhen] = useState<WhenFilter | null>(null);
  const [date, setDate] = useState("");
  const [part, setPart] = useState<DayPart>("any");
  const [vehicle, setVehicle] = useState<VehicleType | "">("");
  const [color, setColor] = useState("");
  const [gone, setGone] = useState<Set<number>>(new Set());
  const [flare, setFlare] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (navigateTimer.current !== null) window.clearTimeout(navigateTimer.current);
    };
  }, []);

  function drop(predicate: (id: number) => boolean) {
    setGone((current) => {
      const next = new Set(current);
      for (let id = 0; id < NODE_COUNT; id += 1) {
        if (predicate(id)) next.add(id);
      }
      return next;
    });
  }

  function chooseCity(value: City) {
    setCity(value);
    setDate(CITY_DATE[value]);
    drop((id) => id % 4 === 0);
    setStep("when");
  }

  function chooseWhen(filter: WhenFilter) {
    setWhen(filter);
    drop((id) => (filter.known ? id % 4 === 1 : id % 8 === 1));
    setStep("vehicle");
    setError("");
  }

  function useThisDay() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Pick a date, or choose I don't know.");
      return;
    }
    const chosen = DAY_PARTS.find((item) => item.id === part);
    if (!chosen) return;
    chooseWhen({ known: true, date, start: chosen.start, end: chosen.end, part: chosen.id });
  }

  function chooseVehicle(value: VehicleType) {
    setVehicle(value);
    drop((id) => id % 4 === 2);
    setStep("color");
  }

  async function chooseColor(value: string) {
    if (!city || !vehicle) return;
    setColor(value);
    drop((id) => id % 4 === 0 || id % 5 === 2);
    setStep("searching");
    setError("");
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          color: value,
          vehicleType: vehicle,
          location: city,
          knownTime: when?.known === true,
          caseDate: when?.known ? when.date : "",
          startTime: when?.known ? when.start : "",
          endTime: when?.known ? when.end : "",
        }),
      });
      const data = (await response.json()) as { clips?: CaseRecord["clips"]; query?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Search failed.");
      const next: CaseRecord = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        color: value,
        vehicleType: vehicle,
        location: city,
        caseDate: when?.known ? when.date : "",
        timeLabel: when?.known ? whenPartLabel(when.date, when.part) : "Any time",
        stolen: false,
        hitAndRun: false,
        query: data.query || `${value} ${vehicle}`,
        saved: true,
        status: "open",
        clips: data.clips ?? [],
      };
      saveCase(next);
      setFlare(true);
      if (navigateTimer.current !== null) window.clearTimeout(navigateTimer.current);
      navigateTimer.current = window.setTimeout(() => {
        router.replace(`/cases/${next.id}`);
      }, 720);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed.");
      setStep("color");
    }
  }

  const title = useMemo(() => {
    if (step === "city") return "Where was it?";
    if (step === "when") return "When was it?";
    if (step === "vehicle") return "What kind of vehicle?";
    if (step === "color" || step === "searching") return "What color?";
    return "";
  }, [step]);

  const stepNumber = step === "city" ? 1 : step === "when" ? 2 : step === "vehicle" ? 3 : 4;
  const chosenWhen = when?.known ? whenPartLabel(when.date, when.part) : when ? "Any time" : "";

  return (
    <div className="relative min-h-dvh overflow-hidden text-white">
      <ClipField gone={gone} scanning={step === "searching"} flare={flare} />
      <div
        className={`pointer-events-none absolute inset-0 ${
          step === "searching"
            ? "bg-[radial-gradient(ellipse_at_center,rgba(4,7,14,0.15),rgba(4,7,14,0.72))]"
            : "bg-[radial-gradient(ellipse_at_center,rgba(4,7,14,0.35),rgba(4,7,14,0.78))]"
        }`}
      />
      <div className="relative z-20">
        <DeskBar
          action={
            <Link href="/cases" className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/70">
              Cases
            </Link>
          }
        />
      </div>

      <div className="relative z-20 grid min-h-[calc(100dvh-4rem)] place-items-center px-4 pb-16">
        <div className="glass min-h-[34rem] w-full max-w-lg rounded-3xl p-7 text-ink sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {step === "searching" ? "Searching" : `Step ${stepNumber} of 4`}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{step === "searching" ? "Tracing the network" : title}</h1>
          {city ? (
            <p className="mt-2 text-sm text-muted">
              {cityLabel(city)}
              {chosenWhen ? ` · ${chosenWhen}` : ""}
              {vehicle ? ` · ${vehicleLabel(vehicle)}` : ""}
              {color ? ` · ${color}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">Each answer dims nodes that cannot match.</p>
          )}

          {step === "city" ? (
            <div className="mt-6 grid gap-3">
              {CITIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => chooseCity(value)}
                  className="rounded-xl border border-line bg-white/[0.02] px-4 py-4 text-left text-lg font-semibold transition hover:border-navy/80 hover:shadow-[0_0_24px_rgba(94,231,255,0.16)]"
                >
                  {cityLabel(value)}
                </button>
              ))}
            </div>
          ) : null}

          {step === "when" && city ? (
            <div className="mt-6">
              <label className="block text-sm font-medium" htmlFor="case-date">
                Date
              </label>
              <input
                id="case-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-black/30 px-3 py-3 text-base"
              />
              <p className="mt-2 text-sm text-muted">{ARCHIVE_HINT[city]} Times are local to that city.</p>
              <p className="mt-4 text-sm font-medium">Time of day</p>
              <div className="mt-2 grid grid-cols-3 gap-3">
                {DAY_PARTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={part === item.id}
                    onClick={() => setPart(item.id)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                      part === item.id
                        ? "border-navy bg-white/[0.06] shadow-[0_0_24px_rgba(94,231,255,0.16)]"
                        : "border-line bg-white/[0.02] hover:border-navy/80"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={useThisDay}
                className="action mt-4 w-full rounded-xl px-4 py-4 text-left text-lg font-semibold transition"
              >
                {part === "morning" ? "Use this morning" : part === "evening" ? "Use this evening" : "Use this day"}
              </button>
              <button
                type="button"
                onClick={() => chooseWhen({ known: false })}
                className="mt-3 w-full rounded-xl border border-line bg-white/[0.02] px-4 py-4 text-left text-lg font-semibold transition hover:border-navy/80 hover:shadow-[0_0_24px_rgba(94,231,255,0.16)]"
              >
                I don't know
              </button>
            </div>
          ) : null}

          {step === "vehicle" ? (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {VEHICLE_TYPES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => chooseVehicle(value)}
                  className="rounded-xl border border-line bg-white/[0.02] px-4 py-4 text-left font-semibold transition hover:border-navy/80 hover:shadow-[0_0_24px_rgba(94,231,255,0.16)]"
                >
                  {vehicleLabel(value)}
                </button>
              ))}
            </div>
          ) : null}

          {step === "color" ? (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {COLORS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => void chooseColor(value)}
                  className="rounded-xl border border-line bg-white/[0.02] px-4 py-4 text-left font-semibold capitalize transition hover:border-navy/80 hover:shadow-[0_0_24px_rgba(94,231,255,0.16)]"
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}

          {step === "searching" ? (
            <>
              <div className="scan-track mt-8 h-1.5 rounded-full" />
              <p className="mt-4 text-sm text-muted">The closest nodes are lighting up.</p>
            </>
          ) : null}

          {error ? <p className="mt-4 text-sm text-[#e07a7a]">{error}</p> : null}

          {step === "when" || step === "vehicle" || step === "color" ? (
            <button
              type="button"
              onClick={() => setStep(step === "when" ? "city" : step === "vehicle" ? "when" : "vehicle")}
              className="mt-5 text-sm font-medium text-muted"
            >
              Back
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
