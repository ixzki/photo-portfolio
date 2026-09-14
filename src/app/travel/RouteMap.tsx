"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Journey } from "@/lib/journey";
import { buildJourneyTimeline, journeyPosition, visibleSegment } from "@/lib/journey-progress";
import styles from "./travel.module.css";

export default function RouteMap({ journey, timeline, traveled, activeId, onSelect }: {
  journey: Journey;
  timeline: ReturnType<typeof buildJourneyTimeline>;
  traveled: number;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const [mapError, setMapError] = useState(false);
  const routeLines = useRef<L.Polyline[]>([]);
  const drawnDistances = useRef<number[]>([]);
  const headPosition = useRef<L.LatLngExpression>(journey.segments[0]?.[0] ?? [32, 105]);

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomAnimation: false,
      fadeAnimation: false,
      zoomSnap: 0.25,
    }).setView(headPosition.current, 9);
    mapRef.current = map;
    const tiles = L.tileLayer(
      process.env.NEXT_PUBLIC_TRAVEL_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
        maxZoom: 19,
        keepBuffer: 1,
        className: styles.baseTiles,
      },
    ).addTo(map);
    let failedTiles = 0;
    let loadedTiles = 0;
    tiles.on("loading", () => { failedTiles = 0; loadedTiles = 0; });
    tiles.on("tileerror", () => { failedTiles++; });
    tiles.on("tileload", () => { loadedTiles++; });
    tiles.on("load", () => setMapError(failedTiles > 0 && loadedTiles === 0));

    // SVG avoids Canvas's pending redraw after React development remounts.
    const renderer = L.svg({ padding: 0.2 });
    const lines: L.Polyline[] = [];
    for (const segment of journey.segments) {
      if (segment.length < 2) continue;
      lines.push(L.polyline([], { color: "#000", weight: 2.5, opacity: 1, renderer, interactive: false, className: styles.progressLine }).addTo(map));
    }
    routeLines.current = lines;
    const currentMarkers = new Map<string, L.Marker>();
    for (const stop of journey.stops) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = styles.markerButton;
      button.setAttribute("aria-label", `阅读${stop.title}`);
      button.addEventListener("click", (event) => { event.stopPropagation(); onSelect(stop.id); });
      const tooltip = document.createElement("span");
      tooltip.textContent = stop.title;
      const marker = L.marker(stop.position, {
        icon: L.divIcon({ className: styles.marker, html: button, iconSize: [36, 36], iconAnchor: [18, 18] }),
        keyboard: false, // The native button supplies keyboard semantics.
      }).addTo(map);
      marker.bindTooltip(tooltip, { direction: "top", offset: [0, -12], className: styles.tooltip });
      currentMarkers.set(stop.id, marker);
    }
    markers.current = currentMarkers;

    const resize = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
      map.setView(headPosition.current, map.getZoom(), { animate: false });
    });
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      markers.current.clear();
      routeLines.current = [];
      drawnDistances.current = [];
    };
  }, [journey, onSelect]);

  useEffect(() => {
    timeline.segments.forEach((segment, index) => {
      const end = segment.distances[segment.distances.length - 1];
      const amount = traveled < segment.distances[0] ? -1 : Math.min(traveled, end);
      if (drawnDistances.current[index] === amount) {
        return;
      }
      const visible = visibleSegment(segment, traveled);
      routeLines.current[index]?.setLatLngs(visible);
      drawnDistances.current[index] = amount;
    });
    const position = journeyPosition(timeline.segments, traveled);
    if (position && mapRef.current) {
      headPosition.current = position;
      // The camera follows every interpolated route position. No stop-based pan.
      mapRef.current.setView(position, mapRef.current.getZoom(), { animate: false });
    }
  }, [journey, timeline, traveled]);

  useEffect(() => {
    for (const [id, marker] of markers.current) {
      const button = marker.getElement()?.querySelector("button");
      const active = id === activeId;
      button?.setAttribute("data-active", String(active));
      button?.setAttribute("aria-pressed", String(active));
      marker.setZIndexOffset(active ? 1000 : 0);
      marker.closeTooltip();
    }
  }, [activeId, journey]);

  return (
    <>
      <div className={styles.mapFrame}>
        <div className={styles.map} ref={container} aria-label="小黑点居中的随行地图" data-route-progress={timeline.total ? (traveled / timeline.total).toFixed(4) : "0"} />
        <span className={styles.centerDot} data-route-head aria-hidden="true" />
      </div>
      <div className={styles.miniControls} role="group" aria-label="地图操作">
        <button type="button" className="hover-invert" onClick={() => mapRef.current?.zoomIn(undefined, { animate: false })} aria-label="放大地图">+</button>
        <button type="button" className="hover-invert" onClick={() => mapRef.current?.zoomOut(undefined, { animate: false })} aria-label="缩小地图">−</button>
      </div>
      <a className={styles.miniAttribution} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>
      {mapError && <p className={styles.mapError} role="status">底图暂未加载</p>}
    </>
  );
}
