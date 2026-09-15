import assert from "node:assert/strict";
import test from "node:test";
import { metadataImportIssue, updateJourneyMetadata } from "../src/lib/travel-metadata-import.ts";

function fixture() {
  const journey = { title: "已有旅行", segments: [[[40, 90], [40.01, 90.01]], [[41, 91], [41.01, 91.01]]], stops: [
    { id: "story", title: "原有地点", position: [40, 90], routePointIndex: 0, routeEndPointIndex: 1,
      markdown: "**保留 Markdown**", paragraphs: ["旧正文"], images: [{ src: "https://img.ixzki.com/photo.jpg", alt: "照片", width: 4, height: 3 }], featured: true },
  ] };
  return { journey, imported: { segments: structuredClone(journey.segments), pointMeta: Array.from({ length: 4 }, (_, index) => ({ time: 100 + index, altitude: index === 0 ? 0 : index + 1000 })) } };
}

test("metadata-only import preserves route geometry, story anchors, Markdown, images and featured selections", () => {
  const { journey, imported } = fixture();
  const before = structuredClone(journey);
  const updated = updateJourneyMetadata(journey, imported);
  assert.equal(metadataImportIssue(journey, imported), null);
  assert.deepEqual(updated, { ...before, pointMeta: imported.pointMeta });
  assert.equal(updated.segments, journey.segments);
  assert.equal(updated.stops, journey.stops);
  assert.deepEqual(journey, before);
  imported.pointMeta[0].time = 999;
  assert.equal(updated.pointMeta[0].time, 100);
});

test("metadata-only import rejects different coordinates, order, point count or segment boundaries", () => {
  for (const change of [
    imported => { imported.segments[0][1][1] += 0.000001; },
    imported => { imported.segments[0].reverse(); },
    imported => { imported.segments = [imported.segments.flat()]; },
    imported => { imported.segments = [[imported.segments[0][0]], [imported.segments[0][1], ...imported.segments[1]]]; },
    imported => { imported.segments[0].pop(); imported.pointMeta.pop(); },
  ]) {
    const { journey, imported } = fixture();
    change(imported);
    assert.match(metadataImportIssue(journey, imported), /与当前路线不同/);
    assert.throws(() => updateJourneyMetadata(journey, imported), /与当前路线不同/);
    assert.equal(journey.stops[0].markdown, "**保留 Markdown**");
  }
});

test("metadata-only import validates metadata length and values, preserving valid zero and null records", () => {
  for (const change of [
    imported => { imported.pointMeta.pop(); },
    imported => { imported.pointMeta.push({ time: 100, altitude: 500 }); },
    imported => { imported.pointMeta[0] = null; },
    imported => { imported.pointMeta[0].time = NaN; },
    imported => { imported.pointMeta[0].altitude = Infinity; },
  ]) {
    const { journey, imported } = fixture();
    change(imported);
    assert.throws(() => updateJourneyMetadata(journey, imported), /未与轨迹点一一对应/);
  }
  const { journey, imported } = fixture();
  imported.pointMeta[1] = { time: null, altitude: null };
  assert.deepEqual(updateJourneyMetadata(journey, imported).pointMeta, imported.pointMeta);
  assert.match(metadataImportIssue({ segments: [] }, imported), /当前没有轨迹/);
});
