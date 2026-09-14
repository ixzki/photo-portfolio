import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { journeyOutline } from "../src/lib/journey-outline.ts";

test("cover outline fits the complete journey and keeps recording gaps separate", () => {
  const journey = JSON.parse(readFileSync(new URL("../src/data/travel.json", import.meta.url), "utf8"));
  const paths = journeyOutline(journey.segments);
  assert.equal(paths.length, journey.segments.length);
  for (const path of paths) {
    assert.equal((path.match(/M/g) ?? []).length, 1);
    assert.ok(path.includes("L"));
    const coordinates = [...path.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)];
    for (const [, x, y] of coordinates) {
      assert.ok(Number(x) >= 9.99 && Number(x) <= 310.01);
      assert.ok(Number(y) >= 9.99 && Number(y) <= 210.01);
    }
  }
});

test("cover outline preserves north-up orientation and handles an empty journey", () => {
  assert.deepEqual(journeyOutline([]), []);
  const [path] = journeyOutline([[[43, 81], [44, 82]]]);
  const points = [...path.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.ok(points[1][0] > points[0][0]);
  assert.ok(points[1][1] < points[0][1]);
  assert.equal(journeyOutline([[[43, 81], [43, 82]]])[0], "M10.00,110.00 L310.00,110.00");
});
