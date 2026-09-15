import type { Coordinate, JourneyPointMetadata } from "./journey";

export const MAX_IMPORTED_ROUTE_POINTS = 80_000;
export const MAX_IMPORTED_ROUTE_BYTES = 3_000_000;

export interface TravelCsvOptions {
  /** Inclusive endpoints. Dates without an offset use UTC+8, regardless of browser timezone. */
  from: string;
  to: string;
  /** Maximum horizontal error in metres; zero disables the accuracy filter. */
  maxAccuracy: number;
  gapMinutes: number;
  gapKm: number;
}

export interface TravelCsvStats {
  rows: number;
  /** Valid records within the time window, after the optional accuracy filter. */
  matched: number;
  points: number;
  segments: number;
  invalid: number;
  from: string;
  to: string;
}

export interface TravelCsvResult {
  segments: Coordinate[][];
  pointMeta: JourneyPointMetadata[];
  stats: TravelCsvStats;
}

export interface TravelCsvTimeRange {
  from: string;
  to: string;
}

export type TravelCsvWorkerResponse =
  | { type: "progress"; percent: number }
  | ({ type: "range" } & TravelCsvTimeRange)
  | ({ type: "complete" } & TravelCsvResult)
  | { type: "error"; error: string };

interface TimedPoint {
  time: number;
  position: Coordinate;
  altitude?: number | null;
}

const NUMERIC = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const MAX_FIELD_CHARACTERS = 1_000_000;
const MAX_COLUMNS = 1_024;
const aliases = {
  latitude: ["latitude", "lat", "纬度"],
  longitude: ["longitude", "lng", "lon", "long", "经度"],
  time: ["datatime", "timestamp", "time", "datetime", "date", "recordtime", "时间", "记录时间", "定位时间", "日期时间"],
  accuracy: ["accuracy", "horizontalaccuracy", "acc", "精度", "水平精度", "定位精度", "误差"],
  altitude: ["altitude", "alt", "elevation", "ele", "height", "海拔", "海拔高度", "高度", "高程"],
};

/** A bounded, incremental RFC 4180 reader; quoted newlines/escaped quotes can span chunks. */
export function createCsvReader(onRow: (fields: string[]) => void) {
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;
  let afterQuoteWhitespace = false;
  let skipLf = false;
  let firstCharacter = true;
  let rowNumber = 1;

  const fieldEnd = () => {
    fields.push(field);
    if (fields.length > MAX_COLUMNS) throw new Error(`CSV 第 ${rowNumber} 行的列数过多，请检查文件格式。`);
    field = "";
    afterQuote = false;
    afterQuoteWhitespace = false;
  };
  const rowEnd = () => {
    fieldEnd();
    if (fields.some((value) => value.trim() !== "")) onRow(fields);
    fields = [];
    rowNumber += 1;
  };

  return {
    push(chunk: string) {
      for (const character of chunk) {
        if (firstCharacter) {
          firstCharacter = false;
          if (character === "\uFEFF") continue;
        }
        if (skipLf) {
          skipLf = false;
          if (character === "\n") continue;
        }
        if (inQuotes) {
          if (character === '"') {
            inQuotes = false;
            afterQuote = true;
          } else {
            field += character;
          }
        } else if (afterQuote && character === '"' && !afterQuoteWhitespace) {
          field += '"';
          inQuotes = true;
          afterQuote = false;
        } else if (character === ",") {
          fieldEnd();
        } else if (character === "\r" || character === "\n") {
          rowEnd();
          skipLf = character === "\r";
        } else if (afterQuote && (character === " " || character === "\t")) {
          afterQuoteWhitespace = true;
        } else if (afterQuote || (character === '"' && field.length > 0)) {
          throw new Error(`CSV 第 ${rowNumber} 行的引号格式不正确，请重新导出 CSV。`);
        } else if (character === '"') {
          inQuotes = true;
        } else {
          field += character;
        }
        if (field.length > MAX_FIELD_CHARACTERS) throw new Error(`CSV 第 ${rowNumber} 行的字段过长，请检查文件格式。`);
      }
    },
    finish() {
      if (inQuotes) throw new Error(`CSV 第 ${rowNumber} 行缺少结束引号，请重新导出 CSV。`);
      if (field.length || fields.length || afterQuote) rowEnd();
    },
  };
}

/** Unix seconds/milliseconds or an ISO-style timestamp, using UTC+8 when no zone is given. */
export function parseTravelTimestamp(input: string): number {
  const value = input.trim();
  if (NUMERIC.test(value)) {
    const number = Number(value);
    const seconds = Math.abs(number) > 100_000_000_000 ? number / 1_000 : number;
    if (Number.isFinite(seconds) && Math.abs(seconds) <= 8_640_000_000_000) return seconds;
  }
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?(Z|[+-]\d{2}:?\d{2})?$/i.exec(value);
  if (!match) throw new Error("无法识别时间，请使用日期时间、Unix 秒或毫秒时间戳。");
  const [, yearText, monthText, dayText, hourText = "0", minuteText = "0", secondText = "0", fraction = "", zone] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, Number(fraction.padEnd(3, "0").slice(0, 3)));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day ||
      date.getUTCHours() !== hour || date.getUTCMinutes() !== minute || date.getUTCSeconds() !== second) {
    throw new Error("日期或时间不存在，请检查年月日和时分秒。");
  }
  let offsetMinutes = 8 * 60;
  if (zone?.toUpperCase() === "Z") offsetMinutes = 0;
  else if (zone) {
    const offset = zone.slice(1).replace(":", "");
    const hours = Number(offset.slice(0, 2));
    const minutes = Number(offset.slice(2, 4));
    if (hours > 23 || minutes > 59) throw new Error("时间的时区偏移无效。");
    offsetMinutes = (hours * 60 + minutes) * (zone[0] === "-" ? -1 : 1);
  }
  return date.getTime() / 1_000 - offsetMinutes * 60;
}

function validateOptions(options: TravelCsvOptions) {
  let start: number;
  let end: number;
  try {
    start = parseTravelTimestamp(options.from);
    end = parseTravelTimestamp(options.to);
  } catch {
    throw new Error("请选择有效的开始和结束时间（北京时间 UTC+8）。");
  }
  if (start >= end) throw new Error("结束时间必须晚于开始时间。");
  if (!Number.isFinite(options.maxAccuracy) || options.maxAccuracy < 0) throw new Error("定位误差筛选必须为非负数，0 表示不筛选。");
  if (!Number.isFinite(options.gapMinutes) || options.gapMinutes <= 0 ||
      !Number.isFinite(options.gapKm) || options.gapKm <= 0) {
    throw new Error("轨迹断段的时间和距离阈值必须大于 0。");
  }
  return { start, end };
}

function findColumn(headers: string[], name: keyof typeof aliases, required = true) {
  const normalized = headers.map((header) => header.trim().toLowerCase().replace(/[\s_-]/g, ""));
  const candidates = normalized.flatMap((header, index) => aliases[name].includes(header) ? [index] : []);
  const label = { latitude: "纬度 latitude", longitude: "经度 longitude", time: "时间 dataTime", accuracy: "定位精度 accuracy", altitude: "海拔 altitude" }[name];
  if (candidates.length > 1) throw new Error(`CSV 含有多个${label}列，请保留其中一列后导入。`);
  if (!candidates.length && required) throw new Error(`CSV 缺少${label}列，请核对导出的字段。`);
  return candidates[0] ?? -1;
}

function distanceMeters([lat1, lng1]: Coordinate, [lat2, lng2]: Coordinate) {
  const radians = Math.PI / 180;
  const haversine = Math.sin((lat2 - lat1) * radians / 2) ** 2 +
    Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin((lng2 - lng1) * radians / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

/** Sort chronologically, preserve missing-track gaps, and remove only consecutive duplicate positions. */
export function splitTravelPoints(points: TimedPoint[], gapMinutes: number, gapKm: number): Coordinate[][] {
  return splitTravelPointsWithMetadata(points, gapMinutes, gapKm).segments;
}

/** Keep recorded metadata beside each retained coordinate through sorting, deduplication and gaps. */
export function splitTravelPointsWithMetadata(points: TimedPoint[], gapMinutes: number, gapKm: number) {
  const segments: Coordinate[][] = [];
  const pointMeta: JourneyPointMetadata[] = [];
  let segment: Coordinate[] = [];
  let segmentMeta: JourneyPointMetadata[] = [];
  let previous: TimedPoint | undefined;
  let total = 0;
  const append = () => {
    if (segment.length >= 2) {
      total += segment.length;
      if (total > MAX_IMPORTED_ROUTE_POINTS) throw new Error(`路线超过 ${MAX_IMPORTED_ROUTE_POINTS.toLocaleString("zh-CN")} 个点，请缩小导入的日期范围。`);
      segments.push(segment);
      pointMeta.push(...segmentMeta);
    }
    segment = [];
    segmentMeta = [];
  };
  for (const point of [...points].sort((a, b) => a.time - b.time)) {
    const position: Coordinate = point.position.map((value) => Math.round(value * 1_000_000) / 1_000_000) as Coordinate;
    if (previous && (point.time - previous.time > gapMinutes * 60 ||
        distanceMeters(previous.position, position) > gapKm * 1_000)) append();
    const last = segment.at(-1);
    if (!last || last[0] !== position[0] || last[1] !== position[1]) {
      segment.push(position);
      segmentMeta.push({ time: point.time, altitude: typeof point.altitude === "number" && Number.isFinite(point.altitude) ? point.altitude : null });
    }
    if (segment.length >= 2 && total + segment.length > MAX_IMPORTED_ROUTE_POINTS) throw new Error(`路线超过 ${MAX_IMPORTED_ROUTE_POINTS.toLocaleString("zh-CN")} 个点，请缩小导入的日期范围。`);
    previous = { time: point.time, position };
  }
  append();
  if (JSON.stringify({ segments, pointMeta }).length > MAX_IMPORTED_ROUTE_BYTES) throw new Error("路线数据超过 3 MB，请缩小导入的日期范围。");
  return { segments, pointMeta };
}

/** Keeps only selected records in memory. Feed UTF-8 decoded chunks via push(), then call finish(). */
export function createTravelCsvImporter(options: TravelCsvOptions) {
  const { start, end } = validateOptions(options);
  const points: TimedPoint[] = [];
  let columns: { latitude: number; longitude: number; time: number; accuracy: number; altitude: number } | undefined;
  let columnCount = 0;
  let rows = 0;
  let invalid = 0;
  const reader = createCsvReader((fields) => {
    if (!columns) {
      columns = {
        latitude: findColumn(fields, "latitude"),
        longitude: findColumn(fields, "longitude"),
        time: findColumn(fields, "time"),
        accuracy: findColumn(fields, "accuracy", options.maxAccuracy > 0),
        altitude: findColumn(fields, "altitude", false),
      };
      columnCount = fields.length;
      return;
    }
    rows += 1;
    if (fields.length !== columnCount) {
      invalid += 1;
      return;
    }
    const latitude = fields[columns.latitude].trim();
    const longitude = fields[columns.longitude].trim();
    const lat = Number(latitude);
    const lng = Number(longitude);
    let time: number;
    try {
      time = parseTravelTimestamp(fields[columns.time]);
      if (!NUMERIC.test(latitude) || !NUMERIC.test(longitude) || !Number.isFinite(lat) || !Number.isFinite(lng) ||
          Math.abs(lat) > 85.051129 || Math.abs(lng) > 180) throw new Error("无效坐标");
    } catch {
      invalid += 1;
      return;
    }
    if (time < start || time > end) return;
    if (options.maxAccuracy > 0) {
      const accuracyText = fields[columns.accuracy].trim();
      const accuracy = Number(accuracyText);
      if (!NUMERIC.test(accuracyText) || !Number.isFinite(accuracy) || accuracy < 0) {
        invalid += 1;
        return;
      }
      if (accuracy > options.maxAccuracy) return;
    }
    const altitudeText = columns.altitude < 0 ? "" : fields[columns.altitude].trim();
    const altitude = NUMERIC.test(altitudeText) && Number.isFinite(Number(altitudeText)) ? Number(altitudeText) : null;
    points.push({ time, position: [lat, lng], altitude });
  });
  return {
    push: reader.push,
    finish(): TravelCsvResult {
      reader.finish();
      if (!columns) throw new Error("CSV 为空，请选择包含时间和经纬度的足迹导出文件。");
      const { segments, pointMeta } = splitTravelPointsWithMetadata(points, options.gapMinutes, options.gapKm);
      if (!segments.length) {
        throw new Error(`所选时间内没有可用的连续轨迹，请调整时间范围、精度或断段阈值。${invalid ? ` 检测到 ${invalid} 行无效记录。` : ""}`);
      }
      return {
        segments,
        pointMeta,
        stats: {
          rows, matched: points.length, points: segments.reduce((count, segment) => count + segment.length, 0),
          segments: segments.length, invalid,
          from: options.from, to: options.to,
        },
      };
    },
  };
}

/** Scan without retaining GPS points, so a full export can be narrowed before importing. */
export async function detectTravelCsvTimeRange(
  file: Blob,
  onProgress: (percent: number) => void = () => {},
): Promise<TravelCsvTimeRange> {
  let columns: { time: number; latitude: number; longitude: number } | undefined;
  let columnCount = 0;
  let start = Infinity;
  let end = -Infinity;
  const reader = createCsvReader((fields) => {
    if (!columns) {
      columns = {
        time: findColumn(fields, "time"),
        latitude: findColumn(fields, "latitude"),
        longitude: findColumn(fields, "longitude"),
      };
      columnCount = fields.length;
      return;
    }
    if (fields.length !== columnCount) return;
    try {
      const time = parseTravelTimestamp(fields[columns.time]);
      const latitude = fields[columns.latitude].trim();
      const longitude = fields[columns.longitude].trim();
      if (!NUMERIC.test(latitude) || !NUMERIC.test(longitude) ||
          Math.abs(Number(latitude)) > 85.051129 || Math.abs(Number(longitude)) > 180) return;
      const localYear = new Date(time * 1000 + 8 * 3600_000).getUTCFullYear();
      if (!Number.isFinite(localYear) || localYear < 1 || localYear > 9999) return;
      start = Math.min(start, time);
      end = Math.max(end, time);
    } catch { /* Invalid rows must not widen the selected travel window. */ }
  });
  await readTravelCsvFile(file, reader, onProgress);
  reader.finish();
  if (!Number.isFinite(start)) throw new Error("CSV 中没有包含有效时间和经纬度的记录，无法自动识别起止时间。");
  // Round outwards to whole seconds, keeping fractional-second endpoints inclusive.
  const format = (seconds: number) => new Date(seconds * 1000 + 8 * 3600_000).toISOString().slice(0, 19);
  return { from: format(Math.floor(start)), to: format(Math.ceil(end)) };
}

/** Run in a Web Worker; the raw export is never uploaded or decoded as one giant string. */
export async function importTravelCsvFile(
  file: Blob,
  options: TravelCsvOptions,
  onProgress: (percent: number) => void = () => {},
): Promise<TravelCsvResult> {
  const importer = createTravelCsvImporter(options);
  await readTravelCsvFile(file, importer, onProgress);
  return importer.finish();
}

/** Share decoding and chunk handling between lightweight range scans and route imports. */
async function readTravelCsvFile(
  file: Blob,
  readerTarget: { push: (chunk: string) => void },
  onProgress: (percent: number) => void,
) {
  if (!file.size) throw new Error("CSV 文件为空。");
  const prefix = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  const encoding = prefix[0] === 0xff && prefix[1] === 0xfe ? "utf-16le" :
    prefix[0] === 0xfe && prefix[1] === 0xff ? "utf-16be" : "utf-8";
  const decoder = new TextDecoder(encoding, { fatal: true });
  const reader = file.stream().getReader();
  let bytes = 0;
  let reported = -1;
  onProgress(0);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      let text: string;
      try { text = decoder.decode(value, { stream: true }); }
      catch { throw new Error("CSV 编码无法识别，请将文件另存为 UTF-8 CSV 后重试。"); }
      readerTarget.push(text);
      bytes += value.byteLength;
      const percent = Math.min(99, Math.floor(bytes / file.size * 100));
      if (percent !== reported) {
        reported = percent;
        onProgress(percent);
      }
    }
    let finalText: string;
    try { finalText = decoder.decode(); }
    catch { throw new Error("CSV 编码无法识别，请将文件另存为 UTF-8 CSV 后重试。"); }
    readerTarget.push(finalText);
    onProgress(100);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
