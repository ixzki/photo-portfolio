import type { Coordinate, Journey } from "./journey.ts";

export interface TimedSegment {
  points: Coordinate[];
  distances: number[];
}

function distance(a: Coordinate, b: Coordinate) {
  const radians = Math.PI / 180;
  const x = (b[1] - a[1]) * Math.cos((a[0] + b[0]) * radians / 2);
  return Math.hypot(x, b[0] - a[0]) * 111_320;
}

export function buildJourneyTimeline(journey: Journey) {
  let total = 0;
  const points: Coordinate[] = [];
  const distances: number[] = [];
  const segments = journey.segments.map((segment): TimedSegment => ({
    points: segment,
    distances: segment.map((point, index) => {
      // Recording gaps remain disconnected and add no invented road length.
      if (index > 0) total += distance(segment[index - 1], point);
      points.push(point);
      distances.push(total);
      return total;
    }),
  }));
  let previousIndex = 0;
  const stopEndDistances: number[] = [];
  const stopDistances = journey.stops.map((stop) => {
    let index = stop.routePointIndex;
    if (index === undefined) {
      index = previousIndex;
      let nearest = Infinity;
      for (let i = previousIndex; i < points.length; i++) {
        const candidate = distance(points[i], stop.position);
        if (candidate < nearest) { nearest = candidate; index = i; }
      }
    }
    previousIndex = index;
    stopEndDistances.push(distances[stop.routeEndPointIndex ?? index] ?? 0);
    return distances[index] ?? 0;
  });
  return { segments, stopDistances, stopEndDistances, total };
}

export function visibleSegment(segment: TimedSegment, traveled: number): Coordinate[] {
  const { points, distances } = segment;
  if (!points.length || traveled < distances[0]) return [];
  if (traveled >= distances[distances.length - 1]) return points;
  let low = 0;
  let high = distances.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (distances[middle] <= traveled) low = middle + 1;
    else high = middle;
  }
  const result = points.slice(0, low);
  const before = low - 1;
  const amount = (traveled - distances[before]) / (distances[low] - distances[before]);
  result.push([
    points[before][0] + (points[low][0] - points[before][0]) * amount,
    points[before][1] + (points[low][1] - points[before][1]) * amount,
  ]);
  return result;
}

export function journeyPosition(segments: TimedSegment[], traveled: number): Coordinate | undefined {
  // Choose the recorded segment, never interpolate across a recording gap.
  const segment = segments.findLast((item) => item.distances[0] <= traveled) ?? segments[0];
  if (!segment?.points.length) return undefined;
  const { points, distances } = segment;
  if (traveled <= distances[0]) return points[0];
  if (traveled >= distances[distances.length - 1]) return points[points.length - 1];
  let low = 1;
  let high = distances.length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (distances[middle] <= traveled) low = middle + 1;
    else high = middle;
  }
  const amount = (traveled - distances[low - 1]) / (distances[low] - distances[low - 1]);
  return [
    points[low - 1][0] + (points[low][0] - points[low - 1][0]) * amount,
    points[low - 1][1] + (points[low][1] - points[low - 1][1]) * amount,
  ];
}

export function readingProgress(tops: number[], readingLine: number, lastEnd?: number) {
  if (!tops.length || readingLine <= tops[0]) return { index: 0, fraction: 0 };
  for (let index = 0; index < tops.length - 1; index++) {
    if (readingLine < tops[index + 1]) {
      return { index, fraction: Math.max(0, Math.min(1, (readingLine - tops[index]) / Math.max(1, tops[index + 1] - tops[index]))) };
    }
  }
  const index = tops.length - 1;
  const fraction = lastEnd === undefined ? 0 : Math.max(0, Math.min(1, (readingLine - tops[index]) / Math.max(1, lastEnd - tops[index])));
  return { index, fraction };
}

/** Reach compact final stories within the remaining scroll space, without blank filler. */
export function tailReadingLine(base: number, lastBodyBottom: number, remainingScroll: number, viewportHeight: number) {
  const progress = Math.max(0, Math.min(1, 1 - remainingScroll / Math.max(1, viewportHeight * 0.65)));
  return base + Math.max(0, lastBodyBottom - base) * progress;
}

export function readingDistance(
  timeline: Pick<ReturnType<typeof buildJourneyTimeline>, "stopDistances" | "stopEndDistances">,
  index: number,
  fraction: number,
  bodyFraction = 0.8,
) {
  const from = timeline.stopDistances[index] ?? 0;
  const end = timeline.stopEndDistances[index] ?? from;
  const next = timeline.stopDistances[index + 1];
  const progress = Math.max(0, Math.min(1, fraction));
  if (next === undefined) return from + (end - from) * progress;
  // Traverse the selected section while reading its body, then its approach to the next story.
  // Points and adjacent sections keep the original continuous interpolation.
  if (end <= from || next <= end) return from + (next - from) * progress;
  const boundary = Math.max(0.15, Math.min(0.85, bodyFraction));
  if (progress <= boundary) return from + (end - from) * (progress / boundary);
  return end + (next - end) * ((progress - boundary) / (1 - boundary));
}
