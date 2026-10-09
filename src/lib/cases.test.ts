import assert from "node:assert/strict";
import test from "node:test";
import { caseStatus, readCases, saveCase } from "./cases.ts";
import type { CaseRecord } from "./types.ts";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  private limit: number;

  constructor(limit = Number.POSITIVE_INFINITY) {
    this.limit = limit;
  }

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    const next = new Map(this.data);
    next.set(key, value);
    let size = 0;
    for (const [entryKey, entryValue] of next) size += entryKey.length + entryValue.length;
    if (size > this.limit) {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    }
    this.data = next;
  }
}

function baseCase(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "case-1",
    createdAt: "2026-10-09T00:00:00.000Z",
    color: "black",
    vehicleType: "bus",
    location: "new_york",
    caseDate: "",
    timeLabel: "Any time",
    stolen: false,
    hitAndRun: true,
    plate: "ABC123",
    note: "done",
    query: "black bus",
    saved: true,
    status: "open",
    clips: [],
    ...overrides,
  };
}

test("saveCase marks the filing closed and keeps plate notes", () => {
  const storage = new MemoryStorage();
  // @ts-expect-error test harness
  globalThis.window = { localStorage: storage };

  const filed = saveCase(baseCase({ status: "closed", still: "data:image/jpeg;base64,abc" }));
  assert.equal(filed.status, "closed");
  assert.equal(readCases()[0]?.plate, "ABC123");
  assert.equal(caseStatus(readCases()[0]!), "closed");
});

test("saveCase recovers from quota by dropping older stills", () => {
  const storage = new MemoryStorage(2_400);
  // @ts-expect-error test harness
  globalThis.window = { localStorage: storage };

  const bulky = "data:image/jpeg;base64," + "a".repeat(1_200);
  saveCase(baseCase({ id: "old", still: bulky, status: "closed" }));

  const filed = saveCase(
    baseCase({
      id: "new",
      status: "closed",
      plate: "XYZ999",
      still: bulky,
    }),
  );

  const cases = readCases();
  assert.equal(filed.status, "closed");
  assert.equal(filed.plate, "XYZ999");
  assert.ok(filed.still);
  assert.equal(cases.find((item) => item.id === "old")?.still, undefined);
  assert.equal(cases.find((item) => item.id === "new")?.still, bulky);
});
