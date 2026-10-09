import assert from "node:assert/strict";
import test from "node:test";
import { clampView, fitView, vehicleBoxAtTime, type DetectionPayload } from "./vehicle-box.ts";

const payload: DetectionPayload = {
  video_shape: [1080, 1920],
  frames: [
    {
      time_sec: 0,
      shape: [1080, 1920],
      detections: [{ label: "person", bbox: [0, 0, 100, 400] }],
    },
    {
      time_sec: 1,
      shape: [1080, 1920],
      detections: [
        { label: "car", bbox: [200, 400, 500, 700] },
        { label: "truck", bbox: [800, 300, 1600, 900] },
      ],
    },
  ],
};

test("the nearest frame's largest vehicle becomes the zoom box", () => {
  const box = vehicleBoxAtTime(payload, 0.8);
  assert.ok(box);
  assert.equal(box.x, 800 / 1920);
  assert.equal(box.y, 300 / 1080);
  assert.equal(box.w, 800 / 1920);
  assert.equal(box.h, 600 / 1080);
});

test("a frame with no vehicle leaves the loupe at full frame", () => {
  assert.equal(vehicleBoxAtTime(payload, 0), null);
});

test("fit centers the vehicle and stays inside the frame", () => {
  const box = vehicleBoxAtTime(payload, 1);
  assert.ok(box);
  const view = fitView(box, 1000, 500);
  assert.ok(view.scale > 1);
  const clamped = clampView(view, 1000, 500);
  assert.deepEqual(clamped, view);
  assert.ok(view.x <= 0);
  assert.ok(view.y <= 0);
});
