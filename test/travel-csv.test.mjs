import assert from "node:assert/strict";
import test from "node:test";
import {
  createCsvReader, createTravelCsvImporter, detectTravelCsvTimeRange, importTravelCsvFile,
  parseTravelTimestamp, splitTravelPoints, MAX_IMPORTED_ROUTE_POINTS,
} from "../src/lib/travel-csv.ts";

const options = {
  from: "2024-05-01T08:00", to: "2024-05-06T23:59", maxAccuracy: 0, gapMinutes: 60, gapKm: 5,
};

test("automatic time range scans unsorted valid GPS records in Beijing time before accuracy filtering", async () => {
  const csv = `dataTime,latitude,longitude,accuracy,note
2024-05-05T06:16:34Z,43,81,999,"last, valid"
invalid,43,81,5,
1999-01-01T00:00,999,81,5,
2099-01-01T00:00,43,,5,
2024-05-01T08:02:36,43,81,5,"first
valid"
2024-05-02T00:00,43,81,5,
`;
  const progress = [];
  assert.deepEqual(await detectTravelCsvTimeRange(new Blob([csv]), (value) => progress.push(value)), {
    from: "2024-05-01T08:02:36", to: "2024-05-05T14:16:34",
  });
  assert.equal(progress[0], 0);
  assert.equal(progress.at(-1), 100);
});

test("automatic range handles UTF-16 Chinese fields and inclusive fractional Unix endpoints", async () => {
  const start = Date.parse("2024-04-01T03:44:33.123Z");
  const end = start + 60_750;
  const csv = `\ufeff记录时间,纬度,经度\r\n${end},43.001,81\r\n${start / 1000},43,81\r\n`;
  const file = new Blob([Buffer.from(csv, "utf16le")]);
  const range = await detectTravelCsvTimeRange(file);
  assert.deepEqual(range, { from: "2024-04-01T11:44:33", to: "2024-04-01T11:45:34" });
  const imported = await importTravelCsvFile(file, { ...options, ...range });
  assert.equal(imported.stats.matched, 2);
  assert.equal(imported.pointMeta[0].time, start / 1000);
  assert.equal(imported.pointMeta[1].time, end / 1000);
});

test("automatic range reports malformed and missing data, without inventing a duration for one timestamp", async () => {
  await assert.rejects(detectTravelCsvTimeRange(new Blob([])), /为空/);
  await assert.rejects(detectTravelCsvTimeRange(new Blob(["lat,lon\n43,81"])), /缺少时间/);
  await assert.rejects(detectTravelCsvTimeRange(new Blob(["time,lat,lon\ninvalid,43,81\n2099-01-01,999,81"])), /没有包含有效时间/);
  await assert.rejects(detectTravelCsvTimeRange(new Blob([new Uint8Array([0xff, 0xff])])), /UTF-8/);
  await assert.rejects(detectTravelCsvTimeRange(new Blob(['time,lat,lon\n"broken'])), /引号/);
  const range = await detectTravelCsvTimeRange(new Blob(["time,lat,lon\n2024-05-01T08:00,43,81"]));
  assert.equal(range.from, range.to);
});

test("CSV quote escaping, BOM and multiline fields survive every chunk boundary", () => {
  const csv = '\ufefftime,latitude,longitude,note\r\n"2024-05-01T08:00",43,81,"a,""b""\r\nc"\r\n2024-05-01T08:01,43.001,81,""';
  const expected = [
    ["time", "latitude", "longitude", "note"],
    ["2024-05-01T08:00", "43", "81", 'a,"b"\r\nc'],
    ["2024-05-01T08:01", "43.001", "81", ""],
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
  const expected = Date.parse("2024-05-01T00:00:00Z") / 1000;
  for (const value of [String(expected), String(expected * 1000), "2024-05-01 08:00", "2024/5/1 8:00:00", "2024-05-01T08:00:00+08:00", "2024-05-01T00:00:00Z"]) {
    assert.equal(parseTravelTimestamp(value), expected, value);
  }
  for (const value of ["", "Infinity", "2026-02-30T12:00", "2024-05-01T24:00", "2024-05-01T00:00:00+08:99"]) {
    assert.throws(() => parseTravelTimestamp(value));
  }
});

test("import filters inclusive endpoints, sorts, validates and preserves missing-track gaps", async () => {
  const csv = `dataTime,longitude,latitude,accuracy
2024-05-01T08:02,81,43.002,5
2024-05-01T07:59:59,81,43,5
2024-05-01T08:00,81,43,5
2024-05-01T08:01,81,43,5
2024-05-01T08:03,81,43.003,500
2024-05-01T08:04,81,43.004,-1
bad-time,81,43,5
2024-05-01T08:04,999,43,5
2024-05-01T10:05,82,44,5
2024-05-01T10:06,82,44.001,5
2024-05-01T10:07,82,44.002,5
`;
  const progress = [];
  const result = await importTravelCsvFile(new Blob([csv]), { ...options, to: "2024-05-01T10:06", maxAccuracy: 100 }, (percent) => progress.push(percent));
  assert.deepEqual(result.segments, [[[43, 81], [43.002, 81]], [[44, 82], [44.001, 82]]]);
  assert.deepEqual(result.stats, {
    rows: 11, matched: 5, points: 4, segments: 2, invalid: 3,
    from: options.from, to: "2024-05-01T10:06",
  });
  assert.equal(progress[0], 0);
  assert.equal(progress.at(-1), 100);
});

test("Chinese aliases and UTF-16 BOM exports work; unknown or ambiguous columns explain the issue", async () => {
  const csv = "记录时间,纬度,经度\r\n2024-05-01T08:00,43,81\r\n2024-05-01T08:01,43.001,81\r\n";
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
  await assert.rejects(importTravelCsvFile(new Blob(["time,lat,lon\nwrong,,\n2024-05-01T08:00,43\n"]), options), /2 行无效记录/);
});

test("point limits reject the import without silently simplifying the recorded track", () => {
  const points = Array.from({ length: MAX_IMPORTED_ROUTE_POINTS + 1 }, (_, index) => ({
    time: index, position: [43 + index / 1000000, 81],
  }));
  assert.throws(() => splitTravelPoints(points, 60, 5), /超过 80,000 个点/);
});

test("timestamps and optional elevation stay aligned after sorting, duplicate removal, accuracy filtering and singleton gaps", async () => {
  const csv = `time,lat,lon,accuracy,altitude
2024-05-01T08:02,43.002,81,5,1200
2024-05-01T08:00,43,81,5,-5.5
2024-05-01T08:01,43,81,5,900
2024-05-01T08:03,43.003,81,999,2000
2024-05-01T09:30,44,82,5,3000
2024-05-01T11:00,45,83,5,
2024-05-01T11:01,45.001,83,5,0
2024-05-01T11:02,45.002,83,5,unknown
`;
  const result = await importTravelCsvFile(new Blob([csv]), { ...options, maxAccuracy: 100 });
  assert.deepEqual(result.segments, [[[43, 81], [43.002, 81]], [[45, 83], [45.001, 83], [45.002, 83]]]);
  assert.deepEqual(result.pointMeta, [
    { time: parseTravelTimestamp("2024-05-01T08:00"), altitude: -5.5 },
    { time: parseTravelTimestamp("2024-05-01T08:02"), altitude: 1200 },
    { time: parseTravelTimestamp("2024-05-01T11:00"), altitude: null },
    { time: parseTravelTimestamp("2024-05-01T11:01"), altitude: 0 },
    { time: parseTravelTimestamp("2024-05-01T11:02"), altitude: null },
  ]);
  assert.equal(result.pointMeta.length, result.stats.points);
  const noAltitude = await importTravelCsvFile(new Blob(["time,lat,lon\n2024-05-01T08:00,43,81\n2024-05-01T08:01,43.001,81"]), options);
  assert.deepEqual(noAltitude.pointMeta.map((point) => point.altitude), [null, null]);
});
