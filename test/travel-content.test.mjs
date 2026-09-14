import assert from "node:assert/strict";
import test from "node:test";
import { initialTravel } from "../src/lib/travel-seed.mjs";
import { assertJourney } from "../src/lib/journey.ts";
import { createEmptyTravel, validateTravelDocument, travelSummary, MAX_TRAVEL_POINTS } from "../src/lib/travel-content.ts";

function draft() {
  const document = createEmptyTravel();
  document.journey.segments = [[[40, 80], [40, 81], [40, 82]], [[41, 83], [41, 84]]];
  document.journey.stops = [
    { id: "start", title: "出发", position: [40, 80], routePointIndex: 0, paragraphs: [], images: [], markdown: "出发。" },
    { id: "end", title: "到达", position: [41, 84], routePointIndex: 4, paragraphs: [], images: [], markdown: "到达。" },
  ];
  return document;
}

test("empty drafts can be saved but publication requires a route, body, and cover", () => {
  const document = createEmptyTravel();
  assert.equal(validateTravelDocument(document).visible, false);
  document.visible = true;
  assert.throws(() => validateTravelDocument(document), /封面/);
  document.cover.src = "https://img.ixzki.com/cover.jpg";
  assert.throws(() => validateTravelDocument(document), /路线/);
  Object.assign(document.journey, draft().journey);
  document.journey.stops.forEach((stop) => { stop.markdown = ""; });
  assert.throws(() => validateTravelDocument(document), /正文或图片/);
  document.journey.stops[0].markdown = "旅行正文";
  assert.doesNotThrow(() => validateTravelDocument(document));
});

test("the existing Xinjiang migration seed retains all coordinates and chronological stops", () => {
  const seed = initialTravel();
  const normalized = validateTravelDocument(seed);
  assert.deepEqual(normalized.journey.segments, seed.journey.segments);
  assert.equal(normalized.journey.stops.length, 9);
  assertJourney(normalized.journey);
  assert.equal(travelSummary(normalized).pointCount, 20168);
});

test("body sorting and anchor coordinates are normalized without mutating the editor document", () => {
  const document = draft();
  document.journey.stops.reverse();
  document.journey.stops[0].position = [0, 0];
  const normalized = validateTravelDocument(document);
  assert.deepEqual(normalized.journey.stops.map((stop) => stop.id), ["start", "end"]);
  assert.deepEqual(normalized.journey.stops[1].position, [41, 84]);
  assert.deepEqual(document.journey.stops[0].position, [0, 0]);
  assertJourney(normalized.journey);
});

test("line sections may span recording gaps but cannot overlap the next story start", () => {
  const document = draft();
  document.journey.stops[0].routeEndPointIndex = 4;
  assert.doesNotThrow(() => validateTravelDocument(document));
  assertJourney(validateTravelDocument(document).journey);
  document.journey.stops[1].routePointIndex = 3;
  assert.throws(() => validateTravelDocument(document), /超过了下一段正文/);
  document.journey.stops[0].routeEndPointIndex = 0;
  assert.throws(() => validateTravelDocument(document), /终点应在起点之后/);
});

test("invalid coordinates, indexes, duplicate IDs, route sizes, and colors are rejected", () => {
  const cases = [
    (value) => { value.journey.segments[0][0][0] = 91; },
    (value) => { value.journey.stops[0].routePointIndex = 100; },
    (value) => { value.journey.stops[1].id = "start"; },
    (value) => { value.journey.stops[0].title = " "; },
    (value) => { value.journey.stops[0].routeEndPointIndex = -1; },
    (value) => { value.journey.segments = [Array.from({ length: MAX_TRAVEL_POINTS + 1 }, () => [40, 80])]; },
    (value) => { value.shade = "#ff0000"; },
    (value) => { value.slug = "../private"; },
    (value) => { value.visible = "true"; },
    (value) => { value.revision = 3.5; },
  ];
  for (const change of cases) {
    const value = draft(); change(value);
    assert.throws(() => validateTravelDocument(value));
  }
});

test("image URLs use img.ixzki.com and executable or credential-bearing cover URLs are rejected", () => {
  const document = draft();
  document.cover.src = "https://upyun.ixzki.com/cover.jpg";
  document.journey.stops[0].markdown = "![照片](https://upyun.ixzki.com/a.jpg)\nhttps://upyun.ixzki.com.evil.test/no.jpg";
  const normalized = validateTravelDocument(document);
  assert.equal(normalized.cover.src, "https://img.ixzki.com/cover.jpg");
  assert.match(normalized.journey.stops[0].markdown, /https:\/\/img\.ixzki\.com\/a\.jpg/);
  assert.match(normalized.journey.stops[0].markdown, /https:\/\/upyun\.ixzki\.com\.evil\.test\/no\.jpg/);
  for (const src of ["javascript:alert(1)", "data:image/svg+xml,evil", "https://user:pass@example.com/img.jpg"]) {
    document.cover.src = src;
    assert.throws(() => validateTravelDocument(document));
  }
});
