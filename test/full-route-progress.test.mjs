import assert from "node:assert/strict";
import test from "node:test";
import { buildFullRouteSequence, fullRouteFrame, fullRouteScrollProgress } from "../src/lib/full-route-progress.ts";

test("the pinned full-screen map starts at zero, completes before release and reverses with scrolling", () => {
  const sequence = buildFullRouteSequence(1000, []);
  assert.equal(fullRouteFrame(sequence, fullRouteScrollProgress(900, 3600, 900)).distance, 0);
  assert.equal(fullRouteFrame(sequence, fullRouteScrollProgress(0, 3600, 900)).distance, 0);
  assert.equal(fullRouteFrame(sequence, .99).distance, 1000);
  assert.equal(fullRouteFrame(sequence, fullRouteScrollProgress(-2700, 3600, 900)).distance, 1000);
  const distances = Array.from({ length: 101 }, (_, i) => fullRouteFrame(sequence, i / 100).distance);
  assert(distances.every((distance, i) => !i || distance >= distances[i - 1]));
  assert(fullRouteFrame(sequence, .6).distance > fullRouteFrame(sequence, .3).distance);
});

test("nearby featured places each get a reading interval at their actual recorded distance", () => {
  const highlights = [{ id: "start", distance: 0 }, { id: "a", distance: 2 }, { id: "b", distance: 3 }, { id: "same-place-later", distance: 3 }, { id: "end", distance: 1000 }];
  const sequence = buildFullRouteSequence(1000, highlights);
  for (const highlight of highlights) {
    const hold = sequence.find(stage => stage.activeId === highlight.id && stage.from === stage.to);
    assert(hold.end - hold.start > .01);
    assert.deepEqual(fullRouteFrame(sequence, (hold.start + hold.end) / 2), { distance: highlight.distance, activeId: highlight.id });
  }
  assert.deepEqual(fullRouteFrame(sequence, 1), { distance: 1000, activeId: "end" });
  assert.equal(fullRouteFrame(sequence, 0).activeId, undefined);
});

test("empty and zero-length routes stay finite", () => {
  assert.deepEqual(fullRouteFrame([], .5), { distance: 0, activeId: undefined });
  assert.equal(fullRouteFrame(buildFullRouteSequence(0, [{ id: "stop", distance: 0 }]), 1).distance, 0);
  assert.equal(fullRouteScrollProgress(-100, 900, 900), 1);
});
