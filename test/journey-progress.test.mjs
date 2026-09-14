import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertJourney } from "../src/lib/journey.ts";
import { buildJourneyTimeline, journeyPosition, visibleSegment, readingProgress, readingDistance, tailReadingLine } from "../src/lib/journey-progress.ts";

const journey = JSON.parse(readFileSync(new URL("../src/data/travel.json", import.meta.url), "utf8"));

test("recorded visits have chronological anchors, including the return to Songshutou", () => {
  const timeline = buildJourneyTimeline(journey);
  assert.equal(journey.stops.length, 9);
  assert.equal(timeline.stopDistances[0], 0);
  assert.equal(timeline.stopDistances.at(-1), timeline.total);
  assert.ok(timeline.stopDistances.every((value, i, list) => i === 0 || value > list[i - 1]));
  assert.ok(journey.stops[4].routePointIndex > journey.stops[2].routePointIndex);
  assert.throws(() => assertJourney({ ...journey, stops: [{ ...journey.stops[0], routePointIndex: 999999 }] }));
  assert.throws(() => assertJourney({ ...journey, stops: [journey.stops[2], journey.stops[0]] }));
});

test("route reveal interpolates an edge and preserves recording gaps", () => {
  const route = { title: "test", stops: [], segments: [[[0, 0], [0, 1]], [[1, 2], [1, 3]]] };
  const timeline = buildJourneyTimeline(route);
  const first = timeline.segments[0];
  const partial = visibleSegment(first, first.distances[1] / 2);
  assert.deepEqual(partial, [[0, 0], [0, 0.5]]);
  assert.deepEqual(visibleSegment(timeline.segments[1], first.distances[1] / 2), []);
  assert.equal(timeline.segments[1].distances[0], first.distances[1]);
  assert.deepEqual(timeline.segments.map(s => visibleSegment(s, timeline.total)), route.segments);
  assert.deepEqual(visibleSegment(first, -1), []);
});

test("reading follows section geometry and reverses on upward scrolling", () => {
  assert.deepEqual(readingProgress([100, 600, 1300], 0), { index: 0, fraction: 0 });
  assert.deepEqual(readingProgress([100, 600, 1300], 350), { index: 0, fraction: 0.5 });
  assert.deepEqual(readingProgress([100, 600, 1300], 950), { index: 1, fraction: 0.5 });
  assert.deepEqual(readingProgress([100, 600, 1300], 600), { index: 1, fraction: 0 });
  assert.deepEqual(readingProgress([100, 600, 1300], 1400), { index: 2, fraction: 0 });
});

test("camera follows intermediate route points, including reverse travel and recording gaps", () => {
  const route = { title: "test", stops: [], segments: [[[0, 0], [0, 1]], [[1, 2], [1, 3]]] };
  const timeline = buildJourneyTimeline(route);
  const boundary = timeline.segments[0].distances[1];
  assert.deepEqual(journeyPosition(timeline.segments, 0), [0, 0]);
  assert.deepEqual(journeyPosition(timeline.segments, boundary * .5), [0, .5]);
  assert.deepEqual(journeyPosition(timeline.segments, boundary * .25), [0, .25]);
  assert.deepEqual(journeyPosition(timeline.segments, boundary), [1, 2]);
  assert.deepEqual(journeyPosition(timeline.segments, timeline.total), [1, 3]);
  assert.equal(journeyPosition([], 0), undefined);
  for (const fraction of [0, .1, .25, .5, .9, 1]) {
    const traveled = timeline.total * fraction;
    const drawn = timeline.segments.flatMap(segment => visibleSegment(segment, traveled));
    assert.deepEqual(journeyPosition(timeline.segments, traveled), drawn.at(-1));
  }
});

test("the final line section finishes while reading the last article, with no following heading", () => {
  const route = {
    title: "Last section",
    segments: [[[0, 0], [0, 1]], [[1, 2], [1, 3]]],
    stops: [{ id: "section", title: "On the road", position: [0, 0], routePointIndex: 0,
      routeEndPointIndex: 3, markdown: "## A section\n\nA journey.", paragraphs: [], images: [] }],
  };
  assertJourney(route);
  const timeline = buildJourneyTimeline(route);
  assert.equal(timeline.stopEndDistances[0], timeline.total);
  const middle = readingProgress([100], 400, 700);
  assert.equal(readingDistance(timeline, middle.index, middle.fraction), timeline.total / 2);
  const end = readingProgress([100], 900, 700);
  assert.equal(readingDistance(timeline, end.index, end.fraction), timeline.total);
  assert.deepEqual(timeline.segments.map(segment => visibleSegment(segment, timeline.total)), route.segments);
});

test("line section progress reaches its end before approaching the next story without a jump", () => {
  const timeline = { stopDistances: [10, 100, 200], stopEndDistances: [60, 100, 240] };
  assert.equal(readingDistance(timeline, 0, 0), 10);
  assert.equal(readingDistance(timeline, 0, .8), 60);
  assert.equal(readingDistance(timeline, 0, .9), 80);
  assert.equal(readingDistance(timeline, 0, 1), readingDistance(timeline, 1, 0));
  assert.equal(readingDistance(timeline, 1, .5), 150);
  assert.equal(readingDistance(timeline, 2, 1), 240);
  const distances = Array.from({ length: 101 }, (_, i) => readingDistance(timeline, 0, i / 100));
  assert.ok(distances.every((value, index) => index === 0 || value >= distances[index - 1]));
});

test("story section ranges reject missing anchors, overlap, backward travel and invalid Markdown", () => {
  const stop = { id: "a", title: "A", position: [0, 0], paragraphs: [], images: [], routePointIndex: 0, routeEndPointIndex: 2 };
  const route = { title: "Ranges", segments: [[[0, 0], [0, 1], [0, 2], [0, 3]]], stops: [stop] };
  assertJourney(route);
  for (const bad of [{ routePointIndex: undefined }, { routeEndPointIndex: 4 }, { routeEndPointIndex: 0 }, { markdown: 42 }]) {
    assert.throws(() => assertJourney({ ...route, stops: [{ ...stop, ...bad }] }));
  }
  assert.throws(() => assertJourney({ ...route, stops: [stop, { ...stop, id: "b", routePointIndex: 1, routeEndPointIndex: 3 }] }));
  assertJourney({ ...route, stops: [stop, { ...stop, id: "b", routePointIndex: 2, routeEndPointIndex: 3 }] });
});

test("compact final notes remain readable and finish the route without extra viewport-height padding", () => {
  // Four short final stories fit in the last viewport; the usual 20% reading line
  // cannot reach the last heading, even after scrolling to the bottom.
  const documentHeight = 3000;
  const viewportHeight = 900;
  const absoluteTops = [2080, 2250, 2440, 2730];
  const lastBodyBottom = 2952;
  const timeline = { stopDistances: [0, 100, 200, 300], stopEndDistances: [0, 100, 200, 400] };
  const distances = [];
  for (let scroll = 1200; scroll <= 2100; scroll += 10) {
    const remaining = documentHeight - scroll - viewportHeight;
    const line = tailReadingLine(220, lastBodyBottom - scroll, remaining, viewportHeight);
    const reading = readingProgress(absoluteTops.map(top => top - scroll), line, Math.min(documentHeight - scroll, remaining + line));
    distances.push(readingDistance(timeline, reading.index, reading.fraction));
  }
  assert.equal(tailReadingLine(220, 2000, 1000, viewportHeight), 220);
  assert.ok(distances.every((value, i) => i === 0 || value >= distances[i - 1]));
  assert.equal(distances.at(-1), 400);
  assert.ok(distances.at(-2) < 400);
  assert.equal(tailReadingLine(220, 100, 0, viewportHeight), 220);
});
