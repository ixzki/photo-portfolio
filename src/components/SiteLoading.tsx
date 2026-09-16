"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./SiteLoading.module.css";

type Phase = "loading" | "leaving" | "idle";
interface LoadRequest { id: number; path: string; phase: Phase; started: number; minimum: number }
const LoadingContext = createContext<{ startNavigation: (href: string) => void }>({
  startNavigation: () => {},
});
const isTravel = (path: string) => path === "/travel" || path.startsWith("/travel/");
const isPublic = (path: string) => !path.startsWith("/admin") && path !== "/setup";

export function useSiteLoading() { return useContext(LoadingContext); }

export default function SiteLoading({ children, siteName }: { children: React.ReactNode; siteName: string }) {
  const pathname = usePathname();
  const sequence = useRef(0);
  const previousPath = useRef(pathname);
  const [request, setRequest] = useState<LoadRequest>({
    id: 0, path: pathname, phase: isPublic(pathname) ? "loading" : "idle", started: 0, minimum: 350,
  });

  const startNavigation = useCallback((href: string) => {
    const target = new URL(href, window.location.href);
    if (target.origin !== window.location.origin || !isTravel(target.pathname) || target.pathname === window.location.pathname) return;
    setRequest({ id: ++sequence.current, path: target.pathname, phase: "loading", started: performance.now(), minimum: 180 });
  }, []);
  const controls = useMemo(() => ({ startNavigation }), [startNavigation]);

  useEffect(() => {
    const onBackOrForward = () => {
      const path = window.location.pathname;
      setRequest({ id: ++sequence.current, path, phase: isTravel(path) ? "loading" : "idle", started: performance.now(), minimum: 180 });
    };
    window.addEventListener("popstate", onBackOrForward);
    return () => window.removeEventListener("popstate", onBackOrForward);
  }, []);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    // A different navigation can interrupt an in-flight trip request.
    const frame = requestAnimationFrame(() => setRequest(current => current.path === pathname ? current : { ...current, phase: "idle" }));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (request.phase === "idle") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = (phase: Phase) => setRequest(current => current.id === request.id ? { ...current, phase } : current);
    if (request.phase === "leaving") {
      const timer = window.setTimeout(() => finish("idle"), reducedMotion ? 100 : 380);
      return () => window.clearTimeout(timer);
    }

    // Network failures must never leave a permanent cover over an error or a usable page.
    const timeout = window.setTimeout(() => finish("leaving"), Math.max(0, 6000 - (performance.now() - request.started)));
    if (pathname !== request.path) return () => window.clearTimeout(timeout);

    let frame = 0;
    let minimumTimer = 0;
    let disposed = false;
    let fontsReady = document.fonts.status === "loaded";
    const check = () => {
      frame = 0;
      const main = document.querySelector("main");
      if (!main?.firstElementChild || main.querySelector("[data-page-pending]") || !fontsReady) return;
      if (pathname === "/travel" && !main.querySelector('[data-page-ready="true"]')) return;
      // Only the leading photo is required; below-the-fold photos and maps load independently.
      const image = main.querySelector<HTMLImageElement>('img[fetchpriority="high"], img.cover-image, img.features-image, img.avatar, img.works-item-image');
      if (image && !image.complete) return;
      const remaining = (reducedMotion ? 0 : request.minimum) - (performance.now() - request.started);
      if (remaining > 0) {
        window.clearTimeout(minimumTimer);
        minimumTimer = window.setTimeout(schedule, remaining);
      } else {
        finish("leaving");
      }
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(check); };
    const observer = new MutationObserver(schedule);
    const main = document.querySelector("main");
    if (main) observer.observe(main, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-page-ready", "src", "srcset"] });
    document.addEventListener("load", schedule, true);
    document.addEventListener("error", schedule, true);
    void document.fonts.ready.then(() => { fontsReady = true; schedule(); });
    schedule();
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      window.clearTimeout(minimumTimer);
      document.removeEventListener("load", schedule, true);
      document.removeEventListener("error", schedule, true);
    };
  }, [pathname, request]);

  return (
    <LoadingContext.Provider value={controls}>
      {request.phase !== "idle" && (
        <div key={request.id} className={styles.screen} data-site-loader data-phase={request.phase} role="status" aria-label="页面加载中">
          <div className={styles.wordmark} aria-hidden="true">
            <span className={styles.outline}>{siteName}</span>
            <span className={styles.ink}>{siteName}</span>
          </div>
        </div>
      )}
      <noscript><style>{"[data-site-loader]{display:none!important}"}</style></noscript>
      {children}
    </LoadingContext.Provider>
  );
}
