"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Journey } from "@/lib/journey";
import { buildJourneyTimeline, journeyPosition, visibleSegment } from "@/lib/journey-progress";
import { buildFullRouteSequence, fullRouteFrame, fullRouteScrollProgress } from "@/lib/full-route-progress";
import { getStopMetadata } from "@/lib/journey-metadata";
import styles from "./travel.module.css";

export default function JourneyFullMap({ journey }: { journey: Journey }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const fitRef = useRef<() => void>(() => {});
  const [mapError, setMapError] = useState(false);
  const timeline = useMemo(() => buildJourneyTimeline(journey), [journey]);
  const highlights = useMemo(() => journey.stops.flatMap((stop, index) => stop.featured ? [{
    ...stop, distance: timeline.stopDistances[index], metadata: getStopMetadata(journey, stop),
  }] : []), [journey, timeline]);
  const sequence = useMemo(() => buildFullRouteSequence(timeline.total, highlights), [timeline, highlights]);

  useEffect(() => {
    if (!container.current || !section.current || !stage.current) return;
    const root = section.current;
    const viewport = stage.current;
    const map = L.map(container.current, {
      zoomControl: false, scrollWheelZoom: false, zoomSnap: .25,
      dragging: !L.Browser.mobile, tapHold: false, zoomAnimation: false, fadeAnimation: false,
    });
    mapRef.current = map;
    map.attributionControl.setPrefix(false);
    const tiles = L.tileLayer(process.env.NEXT_PUBLIC_TRAVEL_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      maxZoom: 19, keepBuffer: 1, className: styles.baseTiles,
    }).addTo(map);
    let loaded = 0;
    let failed = 0;
    tiles.on("loading", () => { loaded = 0; failed = 0; });
    tiles.on("tileload", () => { loaded++; });
    tiles.on("tileerror", () => { failed++; });
    tiles.on("load", () => setMapError(failed > 0 && loaded === 0));

    const bounds = L.latLngBounds(journey.segments.flat());
    const renderer = L.svg({ padding: .2 });
    const lines = timeline.segments.map(() => L.polyline([], {
      color: "#000", weight: 2.5, opacity: 1, interactive: false, renderer,
    }).addTo(map));
    const drawn: number[] = [];
    const head = L.circleMarker(journey.segments[0]?.[0] ?? [35, 105], {
      radius: 4.5, color: "#fff", weight: 2, fillColor: "#000", fillOpacity: 1, interactive: false,
    });
    let activeId: string | undefined;
    let displayedId: string | undefined;
    const featured = highlights.map((stop) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = styles.markerButton;
      button.dataset.featuredStop = stop.id;
      button.setAttribute("aria-label", [stop.title, stop.metadata.time, stop.metadata.altitude].filter(Boolean).join(" · "));
      button.setAttribute("aria-expanded", "false");
      const label = document.createElement("div");
      const title = document.createElement("strong");
      title.className = styles.highlightTitle;
      title.textContent = stop.title;
      label.append(title);
      const metadata = document.createElement("div");
      metadata.className = styles.highlightMeta;
      for (const text of [stop.metadata.time, stop.metadata.altitude].filter(Boolean)) {
        const item = document.createElement("span");
        item.textContent = text;
        metadata.append(item);
      }
      label.append(metadata);
      const marker = L.marker(stop.position, {
        icon: L.divIcon({ className: styles.marker, html: button, iconSize: [36, 36], iconAnchor: [18, 18] }),
        keyboard: false,
      });
      marker.bindTooltip(label, { permanent: true, direction: "top", offset: [0, -14], className: styles.fullRouteCallout, opacity: 1 });
      button.addEventListener("click", event => { event.stopPropagation(); showHighlight(stop.id); });
      button.addEventListener("focus", () => showHighlight(stop.id));
      return { ...stop, marker, button };
    });

    function positionLabel() {
      const item = featured.find(stop => stop.id === displayedId);
      if (!item || !map.hasLayer(item.marker)) return;
      const point = map.latLngToContainerPoint(item.position);
      const width = map.getSize().x;
      const tooltip = item.marker.getTooltip()!;
      tooltip.options.direction = point.x < width * .3 ? "right" : point.x > width * .7 ? "left" : "top";
      tooltip.options.offset = tooltip.options.direction === "top" ? L.point(0, -14) : L.point(0, 0);
      tooltip.update();
    }
    function showHighlight(id?: string) {
      displayedId = id;
      for (const item of featured) {
        const active = item.id === id && map.hasLayer(item.marker);
        item.button.dataset.active = String(active);
        item.button.setAttribute("aria-expanded", String(active));
        if (active) item.marker.openTooltip();
        else item.marker.closeTooltip();
      }
      positionLabel();
    }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = root.getBoundingClientRect();
      // The map stays underneath the journal; covered controls must leave keyboard navigation.
      const bodyTop = root.nextElementSibling?.getBoundingClientRect().top ?? Infinity;
      const navHeight = document.querySelector(".navbar")?.getBoundingClientRect().height ?? 0;
      const covered = bodyTop <= navHeight;
      root.inert = covered;
      root.setAttribute("aria-hidden", String(covered));
      const progress = motion.matches ? 1 : fullRouteScrollProgress(box.top, box.height, viewport.clientHeight);
      const reading = fullRouteFrame(sequence, progress);
      root.dataset.fullRouteProgress = progress.toFixed(4);
      root.dataset.revealDistance = (timeline.total ? reading.distance / timeline.total : 1).toFixed(4);
      root.dataset.activeFeature = reading.activeId ?? "";
      timeline.segments.forEach((segment, index) => {
        const amount = reading.distance < segment.distances[0] ? -1 : Math.min(reading.distance, segment.distances.at(-1)!);
        if (drawn[index] === amount) return;
        drawn[index] = amount;
        lines[index].setLatLngs(visibleSegment(segment, reading.distance));
      });
      const position = journeyPosition(timeline.segments, reading.distance);
      if (position) { head.setLatLng(position); if (!map.hasLayer(head)) head.addTo(map); }
      let markersChanged = false;
      for (const item of featured) {
        const reached = reading.distance >= item.distance;
        if (reached && !map.hasLayer(item.marker)) { item.marker.addTo(map); markersChanged = true; }
        else if (!reached && map.hasLayer(item.marker)) { item.marker.remove(); markersChanged = true; }
      }
      if (activeId !== reading.activeId || markersChanged) {
        activeId = reading.activeId;
        showHighlight(activeId);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const fit = () => {
      map.invalidateSize({ pan: false });
      if (bounds.isValid()) map.fitBounds(bounds, {
        paddingTopLeft: [48, 96], paddingBottomRight: [48, 64], maxZoom: 12, animate: false,
      });
      else map.setView([35, 105], 4);
      schedule();
    };
    fitRef.current = fit;
    fit();
    map.on("moveend zoomend", positionLabel);
    const resize = new ResizeObserver(fit);
    resize.observe(viewport);
    resize.observe(root);
    window.addEventListener("scroll", schedule, { passive: true });
    motion.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      motion.removeEventListener("change", schedule);
      map.remove(); mapRef.current = null; fitRef.current = () => {};
    };
  }, [journey, timeline, highlights, sequence]);

  return <section className={styles.fullRoute} ref={section} aria-label="旅行全程地图">
    <div className={styles.fullRouteStage} ref={stage}>
      <div className={styles.map} ref={container} aria-label="本次旅行的完整路线地图" />
      <div className={styles.mapControls} role="group" aria-label="全程地图操作">
        <button type="button" className="hover-invert" aria-label="放大全程地图" onClick={() => mapRef.current?.zoomIn()}>+</button>
        <button type="button" className="hover-invert" aria-label="缩小全程地图" onClick={() => mapRef.current?.zoomOut()}>−</button>
        <button type="button" className="hover-invert" aria-label="查看完整路线" onClick={() => fitRef.current()}>↗</button>
      </div>
      {mapError && <p className={styles.mapError} role="status">底图暂未加载</p>}
    </div>
  </section>;
}
