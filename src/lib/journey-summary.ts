import type { Journey } from "./journey.ts";
import { buildJourneyTimeline } from "./journey-progress.ts";

/** Sum recorded segments only; gaps have no measured distance. Times include stops and overnight stays. */
export function getJourneySummary(journey: Journey) {
  let startTime: number | null = null;
  let endTime: number | null = null;
  for (const entry of journey.pointMeta ?? []) {
    if (typeof entry.time !== "number" || !Number.isFinite(entry.time)) continue;
    startTime = startTime === null ? entry.time : Math.min(startTime, entry.time);
    endTime = endTime === null ? entry.time : Math.max(endTime, entry.time);
  }
  return {
    distanceMeters: buildJourneyTimeline(journey).total,
    startTime, endTime,
    durationSeconds: startTime === null || endTime === null ? null : endTime - startTime,
  };
}

export function formatJourneyDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "";
  if (seconds === 0) return "0小时";
  if (seconds < 3600) return "不到1小时";
  const totalHours = Math.floor(seconds / 3600);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return [days && `${days}天`, hours && `${hours}小时`].filter(Boolean).join(" ");
}
