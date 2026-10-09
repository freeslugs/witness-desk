"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DeskBar } from "@/components/ui";
import { caseStatus, listCases } from "@/lib/cases";
import { cityLabel, displayWhen, formatUpdated, vehicleLabel } from "@/lib/labels";
import type { CaseRecord } from "@/lib/types";

export function CaseList() {
  const [cases, setCases] = useState<CaseRecord[] | null>(null);

  useEffect(() => {
    setCases(listCases());
  }, []);

  const openCount = cases?.filter((item) => caseStatus(item) === "open").length ?? 0;

  return (
    <div className="min-h-full text-ink">
      <DeskBar
        action={
          <Link
            href="/new"
            className="action rounded-md px-3.5 py-2 text-sm font-semibold transition"
          >
            Submit new case
          </Link>
        }
      />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-navy">Case file</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <h1 className="text-4xl font-semibold tracking-tight">Cases</h1>
          <p className="font-mono text-xs text-muted">
            {cases === null ? "Loading" : cases.length === 0 ? "Empty" : `${openCount} open · ${cases.length - openCount} closed`}
          </p>
        </div>

        {cases === null ? null : cases.length === 0 ? (
          <div className="glass mt-8 rounded-2xl px-6 py-12">
            <p className="max-w-md text-muted">No cases on this desk. Submit one to search every camera in a city.</p>
            <Link href="/new" className="action mt-6 inline-flex rounded-md px-4 py-2.5 text-sm font-semibold">
              Submit new case
            </Link>
          </div>
        ) : (
          <ul className="glass mt-8 overflow-hidden rounded-2xl">
            {cases.map((item) => {
              const status = caseStatus(item);
              const open = status === "open";
              return (
                <li key={item.id} className="border-t border-line first:border-t-0">
                  <Link href={`/cases/${item.id}`} className="group grid gap-3 px-5 py-4 transition hover:bg-white/[0.03] sm:grid-cols-[7rem_1fr_auto] sm:items-center">
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{item.id.slice(0, 8)}</span>
                    <span>
                      <span className="block text-lg font-semibold capitalize tracking-tight">
                        {item.color} {vehicleLabel(item.vehicleType)}
                      </span>
                      <span className="mt-1 block font-mono text-xs text-muted">
                        {cityLabel(item.location)} · {displayWhen(item.timeLabel, item.caseDate)}
                      </span>
                      <span className="mt-1 block whitespace-nowrap font-mono text-xs text-muted">
                        Updated {formatUpdated(item.updatedAt || item.createdAt)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 sm:justify-end">
                      <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] ${open ? "border-navy/40 text-navy" : "border-match/30 text-match"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-navy" : "bg-match"}`} />
                        {open ? "Open" : "Closed"}
                      </span>
                      {item.stolen ? <Flag>Stolen</Flag> : null}
                      {item.hitAndRun ? <Flag>Hit and run</Flag> : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function Flag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#e07a7a]/40 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#e07a7a]">
      {children}
    </span>
  );
}
