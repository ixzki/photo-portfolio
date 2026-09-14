import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertJourney } from "../src/lib/journey.ts";

const route = JSON.parse(readFileSync(new URL("../src/data/travel.json", import.meta.url), "utf8"));

test("route schema rejects malformed coordinates and duplicate stops", () => {
  assert.doesNotThrow(() => assertJourney(route));
  assert.throws(() => assertJourney({ ...route, segments: [[[43, 81], [44]]] }));
  assert.throws(() => assertJourney({ ...route, segments: [[[43, 81], [44, 190]]] }));
  assert.throws(() => assertJourney({ ...route, stops: [route.stops[0], route.stops[0]] }));
});

test("Xinjiang route starts and ends at the selected airports, excluding flight legs", () => {
  const points = route.segments.flat();
  assert.ok(points.length > 10000);
  assert.deepEqual(points[0], route.stops[0].position);
  assert.deepEqual(points.at(-1), route.stops.at(-1).position);
  assert.equal(route.stops[0].id, "yining-airport");
  assert.equal(route.stops.at(-1).id, "bozhou-airport");
  assert.ok(points.every(([lat, lng]) => lat > 43 && lat < 45 && lng > 80 && lng < 85));
});

test("discontinuous track segments and stable stop identifiers are retained", () => {
  assert.ok(route.segments.length > 1);
  assert.ok(route.segments.every((segment) => segment.length >= 2));
  assert.equal(new Set(route.stops.map((stop) => stop.id)).size, route.stops.length);
  for (const stop of route.stops) {
    assert.ok(stop.title);
    assert.ok(Array.isArray(stop.paragraphs) && Array.isArray(stop.images));
  }
});
