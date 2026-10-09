"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CaseIndex } from "@/components/case-list";
import { DeskBar } from "@/components/ui";
import { caseStatus, listCases } from "@/lib/cases";
import type { CaseRecord } from "@/lib/types";

const PREVIEW = 5;

export function Landing() {
  const [cases, setCases] = useState<CaseRecord[] | null>(null);

  useEffect(() => {
    setCases(listCases());
  }, []);

  const open = cases?.filter((item) => caseStatus(item) === "open") ?? [];
  const preview = open.slice(0, PREVIEW);
  const rest = open.length - preview.length;

  return (
    <div className="min-h-full text-ink">
      <DeskBar
        action={
          <div className="flex items-center gap-4 sm:gap-5">
            <Link href="/cases" className="font-mono text-[11px] uppercase tracking-[0.16em] text-navy">
              Cases
            </Link>
            <Link href="/new" className="action rounded-md px-3.5 py-2 text-sm font-semibold transition">
              Submit new case
            </Link>
          </div>
        }
      />
      <main className="mx-auto grid max-w-6xl lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
        <section className="flex flex-col justify-center px-5 py-12 sm:px-8 lg:py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-navy">Witness desk</p>
          <h1 className="mt-3 max-w-md font-serif text-5xl leading-[1.05] tracking-[-0.03em]">
            Welcome to Witness Desk.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
            Someone reports a vehicle tied to a crime. This desk helps you find it. Describe what they saw, and Witness searches the cameras in that city. You watch the clips and mark the one that matches.
          </p>
          <ol className="mt-8 max-w-md space-y-3 text-sm">
            <Step n="1">Take the report: city, color, and type.</Step>
            <Step n="2">Watch the clips the cameras returned.</Step>
            <Step n="3">Mark the vehicle, or keep the case open.</Step>
          </ol>
          <Link href="/new" className="action mt-8 inline-flex w-fit rounded-md px-4 py-2.5 text-sm font-semibold">
            Submit new case
          </Link>
        </section>

        <section className="flex flex-col justify-center border-t border-line px-5 py-12 sm:px-8 lg:border-t-0 lg:border-l lg:py-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Open cases</h2>
            <p className="font-mono text-xs text-muted">
              {cases === null ? "Loading" : open.length === 0 ? "None" : `${open.length} still open`}
            </p>
          </div>
          {cases === null ? null : open.length === 0 ? (
            <p className="glass mt-6 rounded-2xl px-5 py-8 text-muted">
              No open cases. A report you have not matched yet will show up here.
            </p>
          ) : (
            <>
              <CaseIndex cases={preview} className="mt-6" />
              <Link href="/cases" className="mt-4 inline-flex font-mono text-[11px] uppercase tracking-[0.16em] text-navy">
                {rest > 0 ? `All cases · ${rest} more open` : "All cases"}
              </Link>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function Step({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="font-mono text-[11px] tracking-[0.14em] text-navy">{n}</span>
      <span>{children}</span>
    </li>
  );
}
