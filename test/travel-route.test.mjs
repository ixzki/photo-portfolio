import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertJourney } from "../src/lib/journey.ts";
import { detectTravelCsvTimeRange, importTravelCsvFile } from "../src/lib/travel-csv.ts";
import { getJourneySummary } from "../src/lib/journey-summary.ts";

const route = JSON.parse(readFileSync(new URL("../src/data/example-journey.json", import.meta.url), "utf8"));

test("route schema rejects malformed coordinates and duplicate stops", () => {
  assert.doesNotThrow(() => assertJourney(route));
  assert.throws(() => assertJourney({ ...route, segments: [[[43, 81], [44]]] }));
  assert.throws(() => assertJourney({ ...route, segments: [[[43, 81], [44, 190]]] }));
  assert.throws(() => assertJourney({ ...route, stops: [route.stops[0], route.stops[0]] }));
});

test("the synthetic route starts and ends at its story anchors", () => {
  const points = route.segments.flat();
  assert.equal(points.length, 49);
  assert.deepEqual(points[0], route.stops[0].position);
  assert.deepEqual(points.at(-1), route.stops.at(-1).position);
  assert.equal(route.stops[0].id, "example-start");
  assert.equal(route.stops.at(-1).id, "example-end");
  assert.ok(points.every(([lat, lng]) => lat >= 46.4 && lat <= 46.53 && lng >= 6.45 && lng <= 6.69));
});

test("the example CSV imports to exactly the demo geometry and generates cover statistics", async () => {
  const file = new Blob([readFileSync(new URL("../examples/example-journey.csv", import.meta.url))]);
  const range = await detectTravelCsvTimeRange(file);
  assert.deepEqual(range, { from: "2024-05-01T08:00:00", to: "2024-05-02T10:50:00" });
  const imported = await importTravelCsvFile(file, { ...range, maxAccuracy: 100, gapMinutes: 60, gapKm: 5 });
  assert.deepEqual(imported.segments, route.segments);
  assert.deepEqual(imported.pointMeta, route.pointMeta);
  assert.equal(imported.stats.invalid, 0);
  const summary = getJourneySummary(route);
  assert.ok(summary.distanceMeters > 1000);
  assert.equal(summary.durationSeconds, 26 * 3600 + 50 * 60);
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
