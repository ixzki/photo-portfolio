import type { Coordinate, Journey, JourneyPointMetadata, JourneyStop } from "./journey";

export const MAX_TRAVEL_BYTES = 3_500_000;
export const MAX_TRAVEL_POINTS = 100_000;
export const MAX_TRAVEL_BLOCKS = 200;

export interface TravelDocument {
  id: string;
  slug: string;
  shade: string;
  cover: { src: string; alt: string; width: number; height: number };
  visible: boolean;
  revision: number;
  updatedAt: string;
  journey: Journey;
}

export interface TravelSummary {
  id: string;
  slug: string;
  title: string;
  shade: string;
  visible: boolean;
  revision: number;
  updatedAt: string;
  stopCount: number;
  pointCount: number;
}

export class TravelValidationError extends Error {
  constructor(message: string) { super(message); this.name = "TravelValidationError"; }
}

export function createEmptyTravel(): TravelDocument {
  const id = crypto.randomUUID();
  return {
    id, slug: `travel-${id.slice(0, 8)}`, shade: "#626262",
    cover: { src: "", alt: "", width: 1600, height: 900 },
    visible: false, revision: 0, updatedAt: new Date().toISOString(),
    journey: { title: "未命名旅行", segments: [], stops: [] },
  };
}

function fail(message: string): never { throw new TravelValidationError(message); }
function object(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(`${name}格式不正确。`);
  return value as Record<string, unknown>;
}
function string(value: unknown, name: string, maximum: number, allowEmpty = false): string {
  if (typeof value !== "string" || value.length > maximum) fail(`${name}格式不正确或长度超过 ${maximum} 个字符。`);
  const text = value.trim();
  if (!allowEmpty && !text) fail(`请填写${name}。`);
  return text;
}
function identifier(value: unknown, name: string): string {
  const id = string(value, name, 100);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) fail(`${name}只能包含字母、数字、短横线和下划线。`);
  return id;
}
function coordinate(value: unknown): Coordinate {
  if (!Array.isArray(value) || value.length !== 2 || value.some((part) => typeof part !== "number" || !Number.isFinite(part)) ||
      Math.abs(value[0]) > 85.051129 || Math.abs(value[1]) > 180) fail("路线中含有无效经纬度，请使用 WGS84 坐标。");
  return [value[0], value[1]];
}
function imageUrl(value: unknown, name: string, allowEmpty = false): string {
  const src = string(value, name, 4096, allowEmpty);
  if (!src) return src;
  let url: URL;
  try { url = new URL(src); } catch { fail(`${name}需要完整的 HTTP 或 HTTPS 链接。`); }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) fail(`${name}需要不含账号密码的 HTTP 或 HTTPS 链接。`);
  return url.href;
}
function dimension(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 100_000) fail(`${name}应为 1 至 100000 的整数。`);
  return value;
}
function image(value: unknown, name: string, allowEmpty = false) {
  const data = object(value, name);
  return {
    src: imageUrl(data.src, `${name}链接`, allowEmpty),
    alt: string(data.alt, `${name}说明`, 500, true),
    width: dimension(data.width, `${name}宽度`), height: dimension(data.height, `${name}高度`),
  };
}
function routeIndex(value: unknown, count: number, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value >= count) fail(`${name}不在当前路线范围内，请重新选择点位。`);
  return value;
}
/** The API persists only this allowlisted, normalized content. Raw HTML is never enabled by the Markdown renderer. */
export function validateTravelDocument(value: unknown): TravelDocument {
  const data = object(value, "旅行");
  const id = identifier(data.id, "旅行 ID");
  const slug = string(data.slug, "网址名称", 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail("网址名称只能使用小写字母、数字和连字符，例如 example-journey。");
  let shade = string(data.shade, "路线灰度", 7).toLowerCase();
  if (/^#[\da-f]{3}$/.test(shade)) shade = `#${[...shade.slice(1)].map((part) => part + part).join("")}`;
  if (!/^#[\da-f]{6}$/.test(shade) || shade.slice(1, 3) !== shade.slice(3, 5) || shade.slice(3, 5) !== shade.slice(5, 7)) fail("路线颜色需要使用灰色，例如 #626262。");
  if (typeof data.visible !== "boolean") fail("请明确选择草稿或发布状态。");
  if (typeof data.revision !== "number" || !Number.isSafeInteger(data.revision) || data.revision < 0 || data.revision > 2_147_483_647) fail("版本号无效，请重新加载旅行。");
  const updatedAt = string(data.updatedAt, "更新时间", 40);
  if (!Number.isFinite(Date.parse(updatedAt))) fail("更新时间无效，请重新加载旅行。");
  const cover = image(data.cover, "封面图", !data.visible);
  const route = object(data.journey, "路线");
  const title = string(route.title, "旅行标题", 200);
  if (!Array.isArray(route.segments) || route.segments.length > 5_000) fail("路线段格式不正确或超过 5000 段。");
  const points: Coordinate[] = [];
  const segments = route.segments.map((raw) => {
    if (!Array.isArray(raw) || raw.length < 2) fail("每条线路段至少需要两个点；空草稿请移除线路段。");
    if (points.length + raw.length > MAX_TRAVEL_POINTS) fail(`路线超过 ${MAX_TRAVEL_POINTS} 个点，请缩小 CSV 时间范围或简化路线。`);
    return raw.map((entry) => {
      const position = coordinate(entry);
      points.push(position);
      return position;
    });
  });
  let pointMeta: JourneyPointMetadata[] | undefined;
  if (route.pointMeta !== undefined) {
    if (!Array.isArray(route.pointMeta) || route.pointMeta.length !== points.length) fail("轨迹时间与海拔数据必须与轨迹点一一对应，请重新导入 CSV。");
    pointMeta = route.pointMeta.map((raw) => {
      const entry = object(raw, "轨迹时间与海拔");
      if (entry.time !== null && (typeof entry.time !== "number" || !Number.isFinite(entry.time) || Math.abs(entry.time) > 8_640_000_000_000)) fail("轨迹时间应为 Unix 秒或空值。");
      if (entry.altitude !== null && (typeof entry.altitude !== "number" || !Number.isFinite(entry.altitude))) fail("海拔应为以米计的数值或空值。");
      return { time: entry.time as number | null, altitude: entry.altitude as number | null };
    });
  }
  if (!Array.isArray(route.stops) || route.stops.length > MAX_TRAVEL_BLOCKS) fail(`正文不能超过 ${MAX_TRAVEL_BLOCKS} 段。`);
  const ids = new Set<string>();
  const stops: JourneyStop[] = route.stops.map((raw) => {
    const stop = object(raw, "正文段");
    const stopId = identifier(stop.id, "正文 ID");
    if (ids.has(stopId)) fail("正文 ID 重复，请重新添加该段。");
    ids.add(stopId);
    const stopTitle = string(stop.title, "地点或线路段名称", 200);
    if (stop.featured !== undefined && typeof stop.featured !== "boolean") fail(`“${stopTitle}”的精选状态应为勾选或未勾选。`);
    coordinate(stop.position);
    const start = routeIndex(stop.routePointIndex, points.length, `“${stopTitle}”的起点`);
    const end = stop.routeEndPointIndex === undefined ? undefined : routeIndex(stop.routeEndPointIndex, points.length, `“${stopTitle}”的终点`);
    if (end !== undefined && end <= start) fail(`“${stopTitle}”的终点应在起点之后。`);
    if (!Array.isArray(stop.paragraphs) || stop.paragraphs.length > 200) fail("旧版正文段格式不正确。");
    const paragraphs = stop.paragraphs.map((text) => string(text, "正文", 100_000, true));
    if (!Array.isArray(stop.images) || stop.images.length > 100) fail("每段最多添加 100 张图片。");
    const images = stop.images.map((entry) => image(entry, "正文图片"));
    const markdown = stop.markdown === undefined ? undefined : string(stop.markdown, "Markdown 正文", 150_000, true);
    return {
      id: stopId, title: stopTitle, position: [...points[start]] as Coordinate,
      routePointIndex: start, ...(end === undefined ? {} : { routeEndPointIndex: end }),
      paragraphs, images, ...(markdown === undefined ? {} : { markdown }),
      ...(stop.featured === undefined ? {} : { featured: stop.featured }),
    };
  }).sort((left, right) => left.routePointIndex! - right.routePointIndex!);
  for (let index = 0; index < stops.length - 1; index++) {
    if (stops[index].routeEndPointIndex !== undefined && stops[index].routeEndPointIndex! > stops[index + 1].routePointIndex!) {
      fail(`“${stops[index].title}”的终点超过了下一段正文的起点，请调整区间或点位。`);
    }
  }
  if (data.visible && (points.length < 2 || stops.length === 0)) fail("发布前需要导入或绘制路线，并添加至少一处地点或线路段正文。");
  if (data.visible && !stops.some((stop) => stop.markdown?.trim() || stop.paragraphs.some((text) => text.trim()) || stop.images.length > 0)) fail("发布前请为地点或线路段填写正文或图片。");
  return { id, slug, shade, cover, visible: data.visible, revision: data.revision, updatedAt,
    journey: { title, segments, stops, ...(pointMeta === undefined ? {} : { pointMeta }) } };
}

export function travelSummary(document: TravelDocument): TravelSummary {
  return {
    id: document.id, slug: document.slug, title: document.journey.title, shade: document.shade,
    visible: document.visible, revision: document.revision, updatedAt: document.updatedAt,
    stopCount: document.journey.stops.length,
    pointCount: document.journey.segments.reduce((count, segment) => count + segment.length, 0),
  };
}
