export type Coordinate = [number, number]; // WGS84, latitude then longitude.

export interface JourneyPointMetadata {
  time: number | null; // Unix seconds; null for unrecorded or hand-drawn points.
  altitude: number | null; // Metres, including elevations below sea level.
}

export interface JourneyStop {
  id: string;
  title: string;
  position: Coordinate;
  routePointIndex?: number; // Chronological index across the recorded segments.
  routeEndPointIndex?: number; // A story about a line section ends at this recorded point.
  featured?: boolean; // Show this existing story anchor on the full-route introduction.
  markdown?: string;
  paragraphs: string[];
  images: { src: string; alt: string; width: number; height: number }[];
}

export interface Journey {
  title: string;
  segments: Coordinate[][];
  pointMeta?: JourneyPointMetadata[]; // Same order and length as segments.flat().
  stops: JourneyStop[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const coordinate = (value: unknown): value is Coordinate =>
  Array.isArray(value) && value.length === 2 &&
  value.every((part) => typeof part === "number" && Number.isFinite(part)) &&
  Math.abs(value[0]) <= 85.051129 && Math.abs(value[1]) <= 180;

export function assertJourney(value: unknown): asserts value is Journey {
  if (!record(value) || typeof value.title !== "string" ||
      !Array.isArray(value.segments) || !Array.isArray(value.stops) ||
      !value.segments.every((segment) => Array.isArray(segment) && segment.length >= 2 && segment.every(coordinate))) {
    throw new Error("Invalid travel route data");
  }
  const ids = new Set<string>();
  const pointCount = value.segments.reduce((count, segment) => count + segment.length, 0);
  if (value.pointMeta !== undefined && (!Array.isArray(value.pointMeta) || value.pointMeta.length !== pointCount ||
      !value.pointMeta.every((entry) => record(entry) &&
        (entry.time === null || (typeof entry.time === "number" && Number.isFinite(entry.time) && Math.abs(entry.time) <= 8_640_000_000_000)) &&
        (entry.altitude === null || (typeof entry.altitude === "number" && Number.isFinite(entry.altitude)))))) {
    throw new Error("Invalid travel point metadata");
  }
  let previousIndex = -1;
  let previousEndIndex = -1;
  for (const stop of value.stops) {
    if (!record(stop) || typeof stop.id !== "string" || !stop.id || ids.has(stop.id) ||
        typeof stop.title !== "string" || !coordinate(stop.position) ||
        (stop.markdown !== undefined && typeof stop.markdown !== "string") ||
        (stop.featured !== undefined && typeof stop.featured !== "boolean") ||
        !Array.isArray(stop.paragraphs) || !stop.paragraphs.every((text) => typeof text === "string") ||
        !Array.isArray(stop.images) || !stop.images.every((image) => record(image) &&
          typeof image.src === "string" && typeof image.alt === "string" &&
          typeof image.width === "number" && Number.isFinite(image.width) && image.width > 0 &&
          typeof image.height === "number" && Number.isFinite(image.height) && image.height > 0)) {
      throw new Error("Invalid travel stop data");
    }
    ids.add(stop.id);
    if (stop.routePointIndex !== undefined) {
      if (!Number.isInteger(stop.routePointIndex) || typeof stop.routePointIndex !== "number" ||
          stop.routePointIndex < previousIndex || stop.routePointIndex < previousEndIndex || stop.routePointIndex < 0 || stop.routePointIndex >= pointCount) {
        throw new Error("Invalid travel stop timeline");
      }
      previousIndex = stop.routePointIndex;
    }
    if (stop.routeEndPointIndex !== undefined) {
      if (typeof stop.routePointIndex !== "number" || typeof stop.routeEndPointIndex !== "number" ||
          !Number.isInteger(stop.routeEndPointIndex) || stop.routeEndPointIndex <= stop.routePointIndex ||
          stop.routeEndPointIndex >= pointCount) {
        throw new Error("Invalid travel section timeline");
      }
      previousEndIndex = stop.routeEndPointIndex;
    }
  }
}
