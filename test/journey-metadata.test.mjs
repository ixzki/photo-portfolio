import assert from "node:assert/strict";
import test from "node:test";
import { formatJourneyTime, getStopMetadata } from "../src/lib/journey-metadata.ts";

const seconds = (value) => Date.parse(value) / 1000;
const journey = {
  title: "旅行", segments: [[[40, 80], [40, 81], [40, 82], [40, 83]]], stops: [],
  pointMeta: [
    { time: seconds("2025-09-29T15:30:00Z"), altitude: 1200.4 },
    { time: seconds("2025-09-29T16:30:00Z"), altitude: 1800.8 },
    { time: seconds("2025-09-29T16:45:00Z"), altitude: 1100.2 },
    { time: null, altitude: null },
  ],
};

test("time labels use UTC+8, slash dates without month/day padding, and correct AM/PM boundaries", () => {
  assert.equal(formatJourneyTime(seconds("2025-09-29T09:00:00Z")), "25/9/29 5PM");
  assert.equal(formatJourneyTime(seconds("2025-12-31T16:05:00Z")), "26/1/1 12AM");
  assert.equal(formatJourneyTime(seconds("2025-09-29T04:00:00Z")), "25/9/29 12PM");
  assert.equal(formatJourneyTime(seconds("2025-09-29T03:59:00Z")), "25/9/29 11AM");
  assert.equal(formatJourneyTime(seconds("2005-01-02T17:00:00Z")), "05/1/3 1AM");
  for (const value of [null, undefined, NaN, Infinity]) assert.equal(formatJourneyTime(value), "");
});

test("point metadata uses exactly its anchor and section metadata includes intermediate elevation extrema", () => {
  assert.deepEqual(getStopMetadata(journey, { routePointIndex: 0 }), { time: "25/9/29 11PM", altitude: "1200M" });
  assert.deepEqual(getStopMetadata(journey, { routePointIndex: 0, routeEndPointIndex: 2 }), {
    time: "25/9/29 11PM–25/9/30 12AM", altitude: "1100–1801M",
  });
  assert.deepEqual(getStopMetadata(journey, { routePointIndex: 1, routeEndPointIndex: 2 }), {
    time: "25/9/30 12AM", altitude: "1100–1801M",
  });
});

test("missing and hand-drawn metadata stays absent; known zero and below-sea-level elevations remain valid", () => {
  assert.deepEqual(getStopMetadata({ ...journey, pointMeta: undefined }, { routePointIndex: 0 }), { time: "", altitude: "" });
  assert.deepEqual(getStopMetadata(journey, { routePointIndex: 3 }), { time: "", altitude: "" });
  assert.deepEqual(getStopMetadata(journey, { routePointIndex: 99 }), { time: "", altitude: "" });
  const partial = { ...journey, pointMeta: [{ time: null, altitude: -4.4 }, { time: null, altitude: 0 }] };
  assert.deepEqual(getStopMetadata(partial, { routePointIndex: 0, routeEndPointIndex: 1 }), { time: "", altitude: "-4–0M" });
});
