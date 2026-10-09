import type { CaseRecord, CaseStatus } from "./types";

const KEY = "witness-desk-cases";

export function readCases(): CaseRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CaseRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCase(record: CaseRecord) {
  const stamped = { ...record, updatedAt: new Date().toISOString(), status: record.status ?? "open" };
  const next = [stamped, ...readCases().filter((item) => item.id !== stamped.id)];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return stamped;
}

export function getCase(id: string) {
  return readCases().find((item) => item.id === id) ?? null;
}

export function listCases() {
  return readCases().sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
}

export function caseStatus(record: CaseRecord): CaseStatus {
  const matched = record.clips.some((clip) => clip.mark === "possible_match") || Boolean(record.still);
  const cleared = record.clips.length > 0 && record.clips.every((clip) => clip.mark === "not_vehicle");
  if (record.status === "closed" || matched || cleared) return "closed";
  return "open";
}
