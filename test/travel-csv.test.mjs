import assert from "node:assert/strict";
import test from "node:test";
import {
  createCsvReader, createTravelCsvImporter, importTravelCsvFile,
  parseTravelTimestamp, splitTravelPoints, MAX_IMPORTED_ROUTE_POINTS,
} from "../src/lib/travel-csv.ts";

const options = {
  from: "2026-06-24T08:00", to: "2026-06-29T23:59", maxAccuracy: 0, gapMinutes: 60, gapKm: 5,
};

test("CSV quote escaping, BOM and multiline fields survive every chunk boundary", () => {
  const csv = '\ufefftime,latitude,longitude,note\r\n"2026-06-24T08:00",43,81,"a,""b""\r\nc"\r\n2026-06-24T08:01,43.001,81,""';
  const expected = [
    ["time", "latitude", "longitude", "note"],
    ["2026-06-24T08:00", "43", "81", 'a,"b"\r\nc'],
    ["2026-06-24T08:01", "43.001", "81", ""],
  ];
  for (let split = 0; split <= csv.length; split++) {
    const rows = [];
    const reader = createCsvReader((row) => rows.push(row));
    reader.push(csv.slice(0, split));
    reader.push(csv.slice(split));
    reader.finish();
    assert.deepEqual(rows, expected, `split at ${split}`);
  }
  const rows = [];
  const reader = createCsvReader((row) => rows.push(row));
  for (const character of csv) reader.push(character);
  reader.finish();
  assert.deepEqual(rows, expected);
});

test("malformed CSV fails instead of silently inventing records", () => {
  for (const csv of ['a,b\n"never ends', 'a,b\n"x"oops,y', 'a,b\nx"y,z']) {
    const reader = createCsvReader(() => {});
    assert.throws(() => { reader.push(csv); reader.finish(); }, /引号/);
  }
});

test("timestamps use explicit UTC+8 and reject impossible dates", () => {
  const expected = Date.parse("2026-06-24T00:00:00Z") / 1000;
  for (const value of [String(expected), String(expected * 1000), "2026-06-24 08:00", "2026/6/24 8:00:00", "2026-06-24T08:00:00+08:00", "2026-06-24T00:00:00Z"]) {
    assert.equal(parseTravelTimestamp(value), expected, value);
  }
  for (const value of ["", "Infinity", "2026-02-30T12:00", "2026-06-24T24:00", "2026-06-24T00:00:00+08:99"]) {
    assert.throws(() => parseTravelTimestamp(value));
  }
});

test("import filters inclusive endpoints, sorts, validates and preserves missing-track gaps", async () => {
  const csv = `dataTime,longitude,latitude,accuracy
2026-06-24T08:02,81,43.002,5
2026-06-24T07:59:59,81,43,5
2026-06-24T08:00,81,43,5
2026-06-24T08:01,81,43,5
2026-06-24T08:03,81,43.003,500
2026-06-24T08:04,81,43.004,-1
bad-time,81,43,5
2026-06-24T08:04,999,43,5
2026-06-24T10:05,82,44,5
2026-06-24T10:06,82,44.001,5
2026-06-24T10:07,82,44.002,5
`;
  const progress = [];
  const result = await importTravelCsvFile(new Blob([csv]), { ...options, to: "2026-06-24T10:06", maxAccuracy: 100 }, (percent) => progress.push(percent));
  assert.deepEqual(result.segments, [[[43, 81], [43.002, 81]], [[44, 82], [44.001, 82]]]);
  assert.deepEqual(result.stats, {
    rows: 11, matched: 5, points: 4, segments: 2, invalid: 3,
    from: options.from, to: "2026-06-24T10:06",
  });
  assert.equal(progress[0], 0);
  assert.equal(progress.at(-1), 100);
});

test("Chinese aliases and UTF-16 BOM exports work; unknown or ambiguous columns explain the issue", async () => {
  const csv = "记录时间,纬度,经度\r\n2026-06-24T08:00,43,81\r\n2026-06-24T08:01,43.001,81\r\n";
  const result = await importTravelCsvFile(new Blob([Buffer.from("\ufeff" + csv, "utf16le")]), options);
  assert.deepEqual(result.segments, [[[43, 81], [43.001, 81]]]);
  const ambiguous = createTravelCsvImporter(options);
  assert.throws(() => ambiguous.push("time,lat,latitude,lon\n"), /多个纬度/);
  const missing = createTravelCsvImporter(options);
  assert.throws(() => missing.push("x,y,z\n"), /缺少纬度/);
  const missingAccuracy = createTravelCsvImporter({ ...options, maxAccuracy: 50 });
  assert.throws(() => missingAccuracy.push("time,lat,lon\n"), /缺少定位精度/);
  assert.throws(() => createTravelCsvImporter({ ...options, from: "2026-06-31" }), /有效的开始/);
  assert.throws(() => createTravelCsvImporter({ ...options, to: options.from }), /晚于/);
});

test("invalid encoding, empty selection and short or invalid records surface useful errors", async () => {
  await assert.rejects(importTravelCsvFile(new Blob([new Uint8Array([0xff, 0xff])]), options), /UTF-8/);
  await assert.rejects(importTravelCsvFile(new Blob([]), options), /为空/);
  await assert.rejects(importTravelCsvFile(new Blob(["time,lat,lon\nwrong,,\n2026-06-24T08:00,43\n"]), options), /2 行无效记录/);
});

test("point limits reject the import without silently simplifying the recorded track", () => {
  const points = Array.from({ length: MAX_IMPORTED_ROUTE_POINTS + 1 }, (_, index) => ({
    time: index, position: [43 + index / 1000000, 81],
  }));
  assert.throws(() => splitTravelPoints(points, 60, 5), /超过 80,000 个点/);
});
