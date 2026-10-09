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

function writeCases(records: CaseRecord[]) {
  window.localStorage.setItem(KEY, JSON.stringify(records));
}

function isQuotaError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

/** Drop bulky stills from every case except the one being saved. */
function withoutOtherStills(records: CaseRecord[], keepId: string) {
  return records.map((item) => (item.id === keepId || !item.still ? item : { ...item, still: undefined }));
}

export function saveCase(record: CaseRecord) {
  const stamped: CaseRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
    status: record.status ?? "open",
  };
  const next = [stamped, ...readCases().filter((item) => item.id !== stamped.id)];

  try {
    writeCases(next);
    return stamped;
  } catch (error) {
    if (!isQuotaError(error)) throw error;
  }

  // Stills are full JPEG data URLs and often blow the ~5MB localStorage budget.
  // Keep the filed case intact; drop older stills and retry.
  try {
    writeCases(withoutOtherStills(next, stamped.id));
    return stamped;
  } catch (error) {
    if (!isQuotaError(error)) throw error;
  }

  // Last resort: persist the filing metadata without this still either.
  const lean = { ...stamped, still: undefined };
  writeCases([lean, ...withoutOtherStills(next, stamped.id).filter((item) => item.id !== stamped.id)]);
  return lean;
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
