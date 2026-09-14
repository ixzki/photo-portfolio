import assert from "node:assert/strict";
import test from "node:test";
import { appendDrawnRoute, nearestRoutePoint, routeRange, removeRouteSegment, sortJourneyStops } from "../src/lib/admin-travel-geometry.ts";

test("a dragged point snaps to the route and retains a revisited location's chronological anchor", () => {
  const points = [[43, 81], [44, 82], [43, 81], [45, 83]];
  assert.equal(nearestRoutePoint(points, [43, 81], 2), 2);
  assert.equal(nearestRoutePoint(points, [44.01, 82.01]), 1);
  assert.equal(nearestRoutePoint([], [0, 0]), -1);
});

test("a story range does not join separate recording segments", () => {
  const segments = [[[0, 0], [0, 1], [0, 2]], [[1, 4], [1, 5], [1, 6]]];
  assert.deepEqual(routeRange(segments, 1, 4), [[[0, 1], [0, 2]], [[1, 4], [1, 5]]]);
});

test("deleting route geometry drops intersecting stories and rebases later anchors without losing their content", () => {
  const journey = { title: "test", segments: [[[0, 0], [0, 1]], [[1, 2], [1, 3]], [[2, 4], [2, 5]]], stops: [
    { id: "before", routePointIndex: 0 }, { id: "overlap", routePointIndex: 1, routeEndPointIndex: 4 },
    { id: "inside", routePointIndex: 2 }, { id: "after", routePointIndex: 4, routeEndPointIndex: 5, markdown: "保留正文" },
  ] };
  const result = removeRouteSegment(journey, 1);
  assert.equal(result.segments.length, 2);
  assert.deepEqual(result.stops, [{ id: "before", routePointIndex: 0 }, { id: "after", routePointIndex: 2, routeEndPointIndex: 3, markdown: "保留正文" }]);
  assert.equal(journey.stops[3].routePointIndex, 4);
});

test("geometry edits preserve metadata alignment without assigning recordings to hand-drawn points", () => {
  const journey = { title: "test", segments: [[[0, 0], [0, 1]], [[1, 2], [1, 3]]], stops: [],
    pointMeta: Array.from({ length: 4 }, (_, time) => ({ time, altitude: time + 1000 })),
  };
  const removed = removeRouteSegment(journey, 0);
  assert.deepEqual(removed.pointMeta, [{ time: 2, altitude: 1002 }, { time: 3, altitude: 1003 }]);
  const drawn = appendDrawnRoute(removed, [[2, 4], [2, 5]]);
  assert.deepEqual(drawn.pointMeta, [...removed.pointMeta, { time: null, altitude: null }, { time: null, altitude: null }]);
  assert.equal(drawn.pointMeta.length, drawn.segments.flat().length);
  assert.equal(journey.pointMeta.length, 4);
  assert.equal(appendDrawnRoute({ ...journey, pointMeta: undefined }, [[2, 4], [2, 5]]).pointMeta, undefined);
});

test("moving and deleting route geometry preserve only surviving stories' featured selections", () => {
  const journey = { title: "test", segments: [[[0, 0], [0, 1]], [[1, 2], [1, 3]], [[2, 4], [2, 5]]], stops: [
    { id: "inside", routePointIndex: 2, featured: true },
    { id: "after", routePointIndex: 4, routeEndPointIndex: 5, featured: true, markdown: "精选路段" },
    { id: "before", routePointIndex: 0, featured: false },
  ] };
  const moved = { ...journey, stops: sortJourneyStops(journey.stops.map((stop) => stop.id === "before" ? { ...stop, routePointIndex: 1 } : stop)) };
  assert.deepEqual(moved.stops.map(({ id, featured }) => ({ id, featured })), [
    { id: "before", featured: false }, { id: "inside", featured: true }, { id: "after", featured: true },
  ]);
  const removed = removeRouteSegment(moved, 1);
  assert.deepEqual(removed.stops, [
    { id: "before", routePointIndex: 1, featured: false },
    { id: "after", routePointIndex: 2, routeEndPointIndex: 3, featured: true, markdown: "精选路段" },
  ]);
  assert.equal(journey.stops[0].featured, true);
  assert.equal(journey.stops[1].routePointIndex, 4);
});
