import assert from "node:assert/strict";
import test from "node:test";
import { hiddenNodeIds, retainedNodeIds } from "./graph-layout.ts";

test("clearing a clip keeps the laid-out nodes so the network does not rebuild", () => {
  const laidOut = ["a", "b", "c"];
  const afterNo = retainedNodeIds(laidOut, ["a", "c"]);
  assert.equal(afterNo, laidOut);
  assert.deepEqual(hiddenNodeIds(afterNo, ["a", "c"]), ["b"]);
});

test("a new clip set starts a fresh layout", () => {
  const laidOut = ["a", "b"];
  const next = ["a", "b", "d"];
  assert.deepEqual(retainedNodeIds(laidOut, next), next);
});
