"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import styles from "./ScrollProgress.module.css";

export default function ScrollProgress() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    const main = document.querySelector("main");
    if (!bar || !main) return;

    let frame = 0;
    let disposed = false;

    const update = () => {
      frame = 0;
      const root = document.scrollingElement ?? document.documentElement;
      let range = root.scrollHeight - root.clientHeight;
      let position = root.scrollTop;

      // Full-page galleries and the desktop About column scroll independently.
      // Other nested controls (maps, editors, lists) do not drive page progress.
      if (range <= 1) {
        range = 0;
        position = 0;
        for (const area of main.querySelectorAll<HTMLElement>("[data-page-scroll-axis]")) {
          const horizontal = area.dataset.pageScrollAxis === "x";
          const style = getComputedStyle(area);
          const overflow = horizontal ? style.overflowX : style.overflowY;
          const areaRange = horizontal
            ? area.scrollWidth - area.clientWidth
            : area.scrollHeight - area.clientHeight;
          if ((overflow === "auto" || overflow === "scroll") && areaRange > 1) {
            range = areaRange;
            position = horizontal ? area.scrollLeft : area.scrollTop;
            break;
          }
        }
      }

      const progress = range > 1 ? Math.min(1, Math.max(0, position / range)) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };

    const scheduleUpdate = () => {
      if (!disposed && !frame) frame = window.requestAnimationFrame(update);
    };

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(document.body);
    resizeObserver.observe(main);
    const contentObserver = new MutationObserver(scheduleUpdate);
    contentObserver.observe(main, { childList: true, subtree: true, characterData: true });

    document.addEventListener("scroll", scheduleUpdate, { capture: true, passive: true });
    document.addEventListener("load", scheduleUpdate, true);
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("pageshow", scheduleUpdate);
    window.visualViewport?.addEventListener("resize", scheduleUpdate);
    void document.fonts.ready.then(scheduleUpdate);
    scheduleUpdate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      contentObserver.disconnect();
      document.removeEventListener("scroll", scheduleUpdate, true);
      document.removeEventListener("load", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("pageshow", scheduleUpdate);
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
    };
  }, [pathname]);

  return <div key={pathname} ref={barRef} className={styles.progress} aria-hidden="true" />;
}
