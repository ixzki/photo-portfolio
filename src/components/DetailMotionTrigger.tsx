"use client";

import { useEffect } from "react";

export default function DetailMotionTrigger() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".detail-page.is-active");
    if (!page) return;

    const targets = [
      ...Array.from(page.querySelectorAll<HTMLElement>(
        ".cover, .project-info-sidebar, .project-footer-container",
      )),
    ];
    targets.forEach((target) => target.classList.remove("is-motion-ready"));

    let lastScrollY = window.scrollY;
    let scrollingDown = true;
    let frame = 0;

    const isCoverUi = (target: HTMLElement) => target.classList.contains("cover");

    const updateMotion = () => {
      frame = 0;
      const nextScrollY = window.scrollY;
      scrollingDown = nextScrollY >= lastScrollY;
      lastScrollY = nextScrollY;

      targets.forEach((target) => {
        const rect = target.getBoundingClientRect();
        const coverUi = isCoverUi(target);
        const shouldHold = !coverUi && nextScrollY <= 8;
        const isInRevealBand = rect.top < window.innerHeight * 1.08 && rect.bottom > window.innerHeight * 0.02;
        const isResetBelow = rect.top > window.innerHeight * 0.82;

        if (shouldHold) {
          target.classList.remove("is-motion-ready");
          return;
        }

        if (isInRevealBand) {
          target.classList.add("is-motion-ready");
          return;
        }

        if (!scrollingDown && isResetBelow) {
          target.classList.remove("is-motion-ready");
        }
      });
    };

    const requestMotionUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateMotion);
    };

    const initialCheck = window.setTimeout(updateMotion, 80);
    const interval = window.setInterval(updateMotion, 160);
    window.addEventListener("scroll", requestMotionUpdate, { passive: true });
    window.addEventListener("resize", requestMotionUpdate);

    return () => {
      window.removeEventListener("scroll", requestMotionUpdate);
      window.removeEventListener("resize", requestMotionUpdate);
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
      targets.forEach((target) => target.classList.remove("is-motion-ready"));
    };
  }, []);

  return null;
}
