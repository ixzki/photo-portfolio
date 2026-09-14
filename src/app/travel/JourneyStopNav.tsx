"use client";

import { useEffect, useRef } from "react";
import type { JourneyStop } from "@/lib/journey";
import styles from "./travel.module.css";

export default function JourneyStopNav({ stops, activeId, visible, onSelect }: {
  stops: Pick<JourneyStop, "id" | "title">[];
  activeId: string;
  visible: boolean;
  onSelect: (id: string) => void;
}) {
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const container = list.current;
    const active = container?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!visible || !container || !active) return;
    const ensureVisible = () => {
      const viewport = container.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      if (item.top < viewport.top + 8 || item.bottom > viewport.bottom - 8) {
        // Scroll only this list; the document's reading position remains unchanged.
        container.scrollTo({
          top: container.scrollTop + item.top + item.height / 2 - viewport.top - viewport.height / 2,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        });
      }
    };
    ensureVisible();
    const resize = new ResizeObserver(ensureVisible);
    resize.observe(container);
    resize.observe(active);
    return () => resize.disconnect();
  }, [activeId, visible]);

  return <nav className={styles.stopNav} aria-label="旅行点位导航" data-visible={visible} inert={!visible}>
    <ol ref={list} className={styles.stopNavList}>
      {stops.map((stop) => <li key={stop.id}>
        <button type="button" aria-controls={`stop-${stop.id}`}
          aria-current={activeId === stop.id ? "location" : undefined}
          onClick={() => onSelect(stop.id)}>{stop.title}</button>
      </li>)}
    </ol>
  </nav>;
}
