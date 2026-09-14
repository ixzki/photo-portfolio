import type { Coordinate, Journey, JourneyStop } from "./journey.ts";

export function nearestRoutePoint(points: Coordinate[], position: Coordinate, preferredIndex?: number) {
  let best = -1;
  let bestDistance = Infinity;
  const scale = Math.cos(position[0] * Math.PI / 180);
  points.forEach((point, index) => {
    const distance = (point[0] - position[0]) ** 2 + ((point[1] - position[1]) * scale) ** 2;
    if (distance < bestDistance - 1e-14 || (Math.abs(distance - bestDistance) < 1e-14 &&
        preferredIndex !== undefined && Math.abs(index - preferredIndex) < Math.abs(best - preferredIndex))) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

export function sortJourneyStops(stops: JourneyStop[]) {
  return [...stops].sort((a, b) => (a.routePointIndex ?? 0) - (b.routePointIndex ?? 0) ||
    (a.routeEndPointIndex ?? a.routePointIndex ?? 0) - (b.routeEndPointIndex ?? b.routePointIndex ?? 0));
}

/** Slice each recording segment separately; never connect recording gaps. */
export function routeRange(segments: Coordinate[][], start: number, end: number) {
  let offset = 0;
  return segments.flatMap((segment) => {
    const part = segment.slice(Math.max(0, start - offset), Math.min(segment.length, end - offset + 1));
    offset += segment.length;
    return part.length > 1 ? [part] : [];
  });
}

/** Remove affected stories and rebase surviving anchors after deleting geometry. */
export function removeRouteSegment(journey: Journey, segmentIndex: number): Journey {
  const segment = journey.segments[segmentIndex];
  if (!segment) return journey;
  const first = journey.segments.slice(0, segmentIndex).reduce((count, part) => count + part.length, 0);
  const last = first + segment.length - 1;
  const rebase = (index: number) => index > last ? index - segment.length : index;
  return {
    ...journey,
    segments: journey.segments.filter((_, index) => index !== segmentIndex),
    stops: journey.stops.filter((stop) => (stop.routeEndPointIndex ?? stop.routePointIndex ?? 0) < first || (stop.routePointIndex ?? 0) > last)
      .map((stop) => ({ ...stop, routePointIndex: rebase(stop.routePointIndex ?? 0),
        ...(stop.routeEndPointIndex !== undefined ? { routeEndPointIndex: rebase(stop.routeEndPointIndex) } : {}) })),
  };
}

export function stopMarkdown(stop: JourneyStop) {
  return stop.markdown ?? [...stop.images.map((photo) => `![${photo.alt.replace(/[\[\]]/g, "")}](${photo.src})`), ...stop.paragraphs].join("\n\n");
}
