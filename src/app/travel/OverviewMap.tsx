"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PublishedJourney } from "@/lib/journeys";
import styles from "./travel.module.css";

export default function OverviewMap({ routes }: { routes: PublishedJourney[] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const bounds = useRef<L.LatLngBounds | null>(null);
  const [mapError, setMapError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { zoomControl: false, scrollWheelZoom: true, zoomSnap: 0.25 }).setView([35, 105], 4);
    mapRef.current = map;
    map.attributionControl.setPrefix(false);
    const tiles = L.tileLayer(process.env.NEXT_PUBLIC_TRAVEL_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      maxZoom: 19, keepBuffer: 1, className: styles.baseTiles,
    }).addTo(map);
    let failed = 0;
    let loaded = 0;
    tiles.on("loading", () => { failed = 0; loaded = 0; });
    tiles.on("tileerror", () => { failed++; });
    tiles.on("tileload", () => { loaded++; });
    tiles.on("load", () => setMapError(failed > 0 && loaded === 0));

    const allBounds = L.latLngBounds([]);
    const renderer = L.svg({ padding: 0.2 });
    for (const { slug, shade, journey } of routes) {
      const href = `/travel/${encodeURIComponent(slug)}`;
      const routeBounds = L.latLngBounds(journey.segments.flat());
      if (!routeBounds.isValid()) continue;
      allBounds.extend(routeBounds);
      const lines = journey.segments.map((points) => L.polyline(points, {
        color: shade, weight: 3, opacity: 1, renderer, interactive: false,
      }).addTo(map));
      const highlight = (active: boolean) => lines.forEach((line) => line.setStyle({ color: active ? "#000" : shade, weight: active ? 4 : 3 }));
      for (const [index, segment] of journey.segments.entries()) {
        // A wide invisible stroke keeps thin routes easy to select with touch.
        const hit = L.polyline(segment, { weight: 22, opacity: 0, renderer, className: styles.routeHit })
          .on("click", () => router.push(href))
          .on("mouseover", () => highlight(true))
          .on("mouseout", () => highlight(false))
          .addTo(map);
        if (index === 0) {
          const path = hit.getElement();
          path?.setAttribute("tabindex", "0");
          path?.setAttribute("role", "link");
          path?.setAttribute("aria-label", `查看${journey.title}路线`);
          path?.addEventListener("focus", () => highlight(true));
          path?.addEventListener("blur", () => highlight(false));
          path?.addEventListener("keydown", (event) => {
            if (event instanceof KeyboardEvent && event.key === "Enter") { event.preventDefault(); router.push(href); }
          });
        }
      }
    }
    bounds.current = allBounds.isValid() ? allBounds : null;
    const fit = () => { if (allBounds.isValid()) map.fitBounds(allBounds, { padding: [54, 65], maxZoom: 10, animate: false }); };
    fit();
    const resize = new ResizeObserver(() => { map.invalidateSize({ pan: false }); fit(); });
    resize.observe(container.current);
    return () => { resize.disconnect(); map.remove(); mapRef.current = null; };
  }, [routes, router]);

  return <>
    <div ref={container} className={styles.map} aria-label="所有旅行路线，点击路线进入游记" />
    <div className={styles.mapControls} role="group" aria-label="地图操作">
      <button type="button" className="hover-invert" aria-label="放大地图" onClick={() => mapRef.current?.zoomIn()}>+</button>
      <button type="button" className="hover-invert" aria-label="缩小地图" onClick={() => mapRef.current?.zoomOut()}>−</button>
      <button type="button" className="hover-invert" aria-label="查看所有路线" onClick={() => {
        if (bounds.current) mapRef.current?.fitBounds(bounds.current, { padding: [54, 65], maxZoom: 10, animate: false });
      }}>↗</button>
    </div>
    {mapError && <p className={styles.mapError} role="status">底图暂未加载</p>}
  </>;
}
