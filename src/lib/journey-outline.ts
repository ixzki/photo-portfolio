import type { Coordinate } from "./journey.ts";

export function journeyOutline(segments: Coordinate[][], width = 320, height = 220, padding = 10) {
  const projected = segments.map((segment) => segment.map(([lat, lng]) => [
    lng * Math.PI / 180,
    -Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)),
  ] as Coordinate));
  const points = projected.flat();
  if (!points.length) return [];
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const fitScale = Math.min(
    maxX > minX ? (width - padding * 2) / (maxX - minX) : Infinity,
    maxY > minY ? (height - padding * 2) / (maxY - minY) : Infinity,
  );
  const scale = Number.isFinite(fitScale) ? fitScale : 1;
  const offsetX = (width - (maxX - minX) * scale) / 2;
  const offsetY = (height - (maxY - minY) * scale) / 2;
  return projected.filter((segment) => segment.length >= 2).map((segment) => {
    let previous: Coordinate | undefined;
    const visible: Coordinate[] = [];
    segment.forEach(([x, y], index) => {
      const point: Coordinate = [(x - minX) * scale + offsetX, (y - minY) * scale + offsetY];
      // Subpixel samples cannot add visible detail to the small cover outline.
      if (!previous || index === segment.length - 1 || Math.hypot(point[0] - previous[0], point[1] - previous[1]) >= .6) {
        visible.push(point);
        previous = point;
      }
    });
    return visible.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  });
}
