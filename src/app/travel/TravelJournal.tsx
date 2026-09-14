"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ImageLoader from "@/components/ImageLoader";
import JourneyMarkdown from "@/components/JourneyMarkdown";
import type { Journey } from "@/lib/journey";
import { buildJourneyTimeline, readingDistance, readingProgress } from "@/lib/journey-progress";
import styles from "./travel.module.css";

const RouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading} role="status" aria-label="地图加载中" />,
});

export default function TravelJournal({ journey }: { journey: Journey }) {
  const timeline = useMemo(() => buildJourneyTimeline(journey), [journey]);
  const [reading, setReading] = useState({ index: 0, distance: 0 });
  const activeId = journey.stops[reading.index]?.id ?? "";
  const articles = useRef(new Map<string, HTMLElement>());
  const mapPane = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [contentVisible, setContentVisible] = useState(false);

  const goToStop = useCallback((id: string) => {
    articles.current.get(id)?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }, []);

  useEffect(() => {
    let frame = 0;
    // A reading line works for both very tall photo sections and short notes.
    const update = () => {
      frame = 0;
      const nav = document.querySelector("nav")?.getBoundingClientRect().height ?? 48;
      setContentVisible((content.current?.getBoundingClientRect().top ?? Infinity) <= nav * 2);
      const mapBottom = mapPane.current?.getBoundingClientRect().bottom ?? nav;
      const readingLine = window.matchMedia("(max-width: 600px)").matches
        ? mapBottom + 16
        : nav + (window.innerHeight - nav) * 0.2;
      const tops = journey.stops.map((stop) => articles.current.get(stop.id)?.getBoundingClientRect().top ?? Infinity);
      const last = articles.current.get(journey.stops.at(-1)?.id ?? "");
      // The final story has no following heading. Its endpoint must be reachable at the page bottom.
      const reachableEnd = document.documentElement.scrollHeight - window.scrollY - window.innerHeight + readingLine;
      const lastEnd = Math.min(last?.getBoundingClientRect().bottom ?? Infinity, reachableEnd);
      const { index, fraction } = readingProgress(tops, window.scrollY <= 1 ? tops[0] : readingLine, lastEnd);
      const article = articles.current.get(journey.stops[index]?.id ?? "");
      const bodyEnd = article?.querySelector("[data-stop-body]")?.getBoundingClientRect().bottom;
      const span = (tops[index + 1] ?? lastEnd) - tops[index];
      const bodyFraction = bodyEnd === undefined ? 0.8 : (bodyEnd - tops[index]) / Math.max(1, span);
      const distance = readingDistance(timeline, index, fraction, bodyFraction);
      setReading((current) => current.index === index && Math.abs(current.distance - distance) < 0.05 ? current : { index, distance });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const resize = new ResizeObserver(schedule);
    for (const article of articles.current.values()) resize.observe(article);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resize.disconnect();
    };
  }, [journey, timeline]);

  return (
    <div className={`detail-content ${styles.journey}`} ref={content}>
      <aside className={styles.mapPane} ref={mapPane} data-visible={contentVisible} aria-label="自驾路线地图">
        <RouteMap journey={journey} timeline={timeline} traveled={reading.distance} activeId={activeId} onSelect={goToStop} />
      </aside>
      <div className={styles.journal}>
        <div className={styles.journalHeader}>
          <h2 className={styles.title}>{journey.title}</h2>
        </div>
        {journey.stops.map((stop) => (
          <article
            key={stop.id}
            id={`stop-${stop.id}`}
            ref={(node) => { if (node) articles.current.set(stop.id, node); else articles.current.delete(stop.id); }}
            className={styles.stop}
            data-active={activeId === stop.id}
            aria-labelledby={`heading-${stop.id}`}
          >
            <h2 id={`heading-${stop.id}`} className={styles.stopTitle}>
              <button type="button" className={`hover-invert${activeId === stop.id ? " is-active" : ""}`} onClick={() => goToStop(stop.id)} aria-current={activeId === stop.id ? "location" : undefined}>
                {stop.title}
              </button>
            </h2>
            <div data-stop-body>
              {stop.images.map((photo, imageIndex) => (
                <figure className={styles.photo} key={`${photo.src}-${imageIndex}`}>
                  <ImageLoader {...photo} sizes="(max-width: 600px) calc(100vw - 32px), (max-width: 1500px) 65vw, calc(96vw - 632px)" />
                </figure>
              ))}
              {stop.paragraphs.length > 0 && <div className={styles.prose}>
                {stop.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
              </div>}
              {stop.markdown && <JourneyMarkdown markdown={stop.markdown} />}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
