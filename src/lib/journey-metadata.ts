import type { Journey, JourneyStop } from "./journey.ts";

/** Display recorded timestamps in Beijing time, independently of browser/server timezone. */
export function formatJourneyTime(seconds: number | null | undefined): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "";
  const date = new Date((seconds + 8 * 60 * 60) * 1_000);
  if (!Number.isFinite(date.getTime())) return "";
  const year = String(date.getUTCFullYear() % 100).padStart(2, "0");
  const hour = date.getUTCHours();
  return `${year}/${date.getUTCMonth() + 1}/${date.getUTCDate()} ${hour % 12 || 12}${hour < 12 ? "AM" : "PM"}`;
}

/** Point stories use their anchor; sections use endpoint times and recorded elevation extrema. */
export function getStopMetadata(journey: Journey, stop: JourneyStop): { time: string; altitude: string } {
  const metadata = journey.pointMeta;
  const start = stop.routePointIndex;
  const end = stop.routeEndPointIndex ?? start;
  if (!metadata || start === undefined || end === undefined || !Number.isInteger(start) || !Number.isInteger(end) ||
      start < 0 || end < start || end >= metadata.length) return { time: "", altitude: "" };
  const firstTime = formatJourneyTime(metadata[start]?.time);
  const lastTime = formatJourneyTime(metadata[end]?.time);
  const time = firstTime && lastTime && firstTime !== lastTime ? `${firstTime}–${lastTime}` : firstTime || lastTime;
  let minimum = Infinity;
  let maximum = -Infinity;
  for (let index = start; index <= end; index++) {
    const altitude = metadata[index]?.altitude;
    if (typeof altitude === "number" && Number.isFinite(altitude)) {
      minimum = Math.min(minimum, altitude);
      maximum = Math.max(maximum, altitude);
    }
  }
  if (!Number.isFinite(minimum)) return { time, altitude: "" };
  const low = Math.round(minimum);
  const high = Math.round(maximum);
  return { time, altitude: low === high ? `${low}M` : `${low}–${high}M` };
}
