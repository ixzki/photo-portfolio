"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordinate, JourneyStop } from "@/lib/journey";
import { nearestRoutePoint, routeRange } from "@/lib/admin-travel-geometry";
import styles from "./AdminTravelEditor.module.css";

export type TravelMapMode = "browse" | "point" | "range" | "draw" | "move" | "start" | "end";
type Props = {
  segments: Coordinate[][]; stops: JourneyStop[]; selectedId: string; mode: TravelMapMode;
  drawing: Coordinate[]; rangeStart: number | null;
  onPick: (index: number) => void; onDraw: (position: Coordinate) => void;
  onSelect: (id: string) => void; onMove: (id: string, index: number) => void;
};

export default function AdminTravelMap(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const callbacks = useRef(props);
  const [tileError, setTileError] = useState(false);
  useEffect(() => { callbacks.current = props; });

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { scrollWheelZoom: false, zoomControl: false, preferCanvas: false }).setView([38, 96], 4);
    map.current = instance;
    L.control.zoom({ position: "topright" }).addTo(instance);
    const tiles = L.tileLayer(process.env.NEXT_PUBLIC_TRAVEL_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, className: styles.tiles,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(instance);
    tiles.on("tileerror", () => setTileError(true));
    tiles.on("tileload", () => setTileError(false));
    instance.on("click", (event: L.LeafletMouseEvent) => {
      const current = callbacks.current;
      const point: Coordinate = [Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6))];
      if (current.mode === "draw") current.onDraw(point);
      else if (current.mode !== "browse") {
        const selected = current.stops.find((stop) => stop.id === current.selectedId);
        const index = nearestRoutePoint(current.segments.flat(), point, selected?.routePointIndex);
        if (index >= 0) current.onPick(index);
      }
    });
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const group = L.featureGroup().addTo(instance);
    for (const segment of props.segments) L.polyline(segment, { color: "#888", weight: 3, interactive: false }).addTo(group);
    if (group.getLayers().length) instance.fitBounds(group.getBounds(), { padding: [36, 36], maxZoom: 13, animate: false });
    return () => { group.remove(); };
  }, [props.segments]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const group = L.layerGroup().addTo(instance);
    const points = props.segments.flat();
    const selected = props.stops.find((stop) => stop.id === props.selectedId);
    if (selected?.routeEndPointIndex !== undefined) {
      for (const segment of routeRange(props.segments, selected.routePointIndex ?? 0, selected.routeEndPointIndex)) {
        L.polyline(segment, { color: "#000", weight: 5, interactive: false }).addTo(group);
      }
      const end = points[selected.routeEndPointIndex];
      if (end) L.circleMarker(end, { radius: 6, color: "#000", fillColor: "#fff", fillOpacity: 1, interactive: false }).addTo(group);
    }
    props.stops.forEach((stop, index) => {
      const active = stop.id === props.selectedId;
      const marker = L.marker(stop.position, {
        draggable: active && props.mode === "browse",
        icon: L.divIcon({ className: `${styles.pin} ${active ? styles.pinActive : ""}`, html: String(index + 1), iconSize: [28, 28], iconAnchor: [14, 14] }),
        title: stop.title, alt: `${index + 1}. ${stop.title}`, keyboard: true,
      }).addTo(group);
      marker.on("click", (event) => { L.DomEvent.stopPropagation(event); callbacks.current.onSelect(stop.id); });
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        const index = nearestRoutePoint(points, [position.lat, position.lng], stop.routePointIndex);
        if (index >= 0) callbacks.current.onMove(stop.id, index);
      });
    });
    if (props.rangeStart !== null && points[props.rangeStart]) L.circleMarker(points[props.rangeStart], { color: "#000", radius: 7, fillOpacity: 1 }).addTo(group);
    if (props.drawing.length) {
      L.polyline(props.drawing, { color: "#000", weight: 3, dashArray: "5 5", interactive: false }).addTo(group);
      props.drawing.forEach((point) => L.circleMarker(point, { radius: 4, color: "#000", fillColor: "#fff", fillOpacity: 1, interactive: false }).addTo(group));
    }
    return () => { group.remove(); };
  }, [props.segments, props.stops, props.selectedId, props.mode, props.drawing, props.rangeStart]);

  return <div className={styles.mapWrap}>
    <div ref={container} className={styles.map} data-mode={props.mode} aria-label="旅行路线编辑地图" />
    <button type="button" className={styles.fitButton} onClick={() => {
      if (props.segments.length) map.current?.fitBounds(L.latLngBounds(props.segments.flat()), { padding: [36, 36], maxZoom: 13 });
    }}>查看全程</button>
    {tileError && <span className={styles.mapNotice} role="status">底图加载中，路线仍可编辑</span>}
  </div>;
}
