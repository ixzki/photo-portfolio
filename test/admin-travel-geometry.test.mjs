import assert from "node:assert/strict";
import test from "node:test";
import { nearestRoutePoint, routeRange, removeRouteSegment } from "../src/lib/admin-travel-geometry.ts";

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
