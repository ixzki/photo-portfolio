import assert from "node:assert/strict";
import test from "node:test";
import { getJourneySummary, formatJourneyDuration } from "../src/lib/journey-summary.ts";

test("cover totals exclude recording gaps but elapsed time includes overnight stops", () => {
  const journey = { title: "路线", stops: [], segments: [[[0, 0], [0, .01]], [[0, 10], [0, 10.01]]],
    pointMeta: [{ time: 100, altitude: null }, { time: 200, altitude: null }, { time: 86500, altitude: null }, { time: 90100, altitude: null }] };
  const summary = getJourneySummary(journey);
  assert(Math.abs(summary.distanceMeters - 2226.4) < .01);
  assert.equal(summary.startTime, 100);
  assert.equal(summary.endTime, 90100);
  assert.equal(formatJourneyDuration(summary.durationSeconds), "1天 1小时");
});

test("missing times remain absent and hand-drawn points do not create timestamps", () => {
  const journey = { title: "路线", stops: [], segments: [[[0, 0], [0, .01]]] };
  assert.equal(getJourneySummary(journey).durationSeconds, null);
  const summary = getJourneySummary({ ...journey, pointMeta: [{ time: null }, { time: 100 }, { time: 0 }, { time: null }] });
  assert.equal(summary.startTime, 0);
  assert.equal(summary.endTime, 100);
  assert.equal(formatJourneyDuration(summary.durationSeconds), "不到1小时");
  for (const value of [null, -1, Infinity, NaN]) assert.equal(formatJourneyDuration(value), "");
  assert.equal(formatJourneyDuration(0), "0小时");
  assert.equal(formatJourneyDuration(59), "不到1小时");
  assert.equal(formatJourneyDuration(59 * 60), "不到1小时");
  assert.equal(formatJourneyDuration(8 * 86400 + 300), "8天");
  assert.equal(formatJourneyDuration(8 * 86400 + 3600 + 120), "8天 1小时");
});
