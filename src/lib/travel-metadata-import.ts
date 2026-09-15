import type { Journey, JourneyPointMetadata } from "./journey.ts";

type RecordedRoute = Pick<Journey, "segments"> & { pointMeta: JourneyPointMetadata[] };

/** Existing story indexes are safe only when segment boundaries and every coordinate are unchanged. */
export function metadataImportIssue(journey: Pick<Journey, "segments">, imported: RecordedRoute): string | null {
  if (!journey.segments.length) return "当前没有轨迹，请先应用导入轨迹。";
  const pointCount = imported.segments.reduce((count, segment) => count + segment.length, 0);
  if (!Array.isArray(imported.pointMeta) || imported.pointMeta.length !== pointCount ||
      !imported.pointMeta.every((entry) => entry &&
        (entry.time === null || (typeof entry.time === "number" && Number.isFinite(entry.time) && Math.abs(entry.time) <= 8_640_000_000_000)) &&
        (entry.altitude === null || (typeof entry.altitude === "number" && Number.isFinite(entry.altitude))))) {
    return "导入的时间和海拔未与轨迹点一一对应，请重新读取 CSV。";
  }
  if (journey.segments.length !== imported.segments.length || journey.segments.some((segment, index) => {
    const other = imported.segments[index];
    return segment.length !== other.length || segment.some((point, pointIndex) =>
      point[0] !== other[pointIndex][0] || point[1] !== other[pointIndex][1]);
  })) return "导入轨迹的坐标、点数或分段与当前路线不同，不能仅更新记录。请核对时间范围和定位误差；直接替换轨迹会清空正文。";
  return null;
}

/** Update sensor records without rebuilding routes, story anchors, Markdown, images or featured selections. */
export function updateJourneyMetadata(journey: Journey, imported: RecordedRoute): Journey {
  const issue = metadataImportIssue(journey, imported);
  if (issue) throw new Error(issue);
  return { ...journey, pointMeta: imported.pointMeta.map(({ time, altitude }) => ({ time, altitude })) };
}
