"use client";

import { useEffect, useRef, useState } from "react";

export default function DetailProjectTitle({ title }: { title: string }) {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const frame = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const update = () => {
      frame.current = 0;
      const nextScrollY = window.scrollY;
      const scrollingDown = nextScrollY > lastScrollY.current;
      const nearTop = nextScrollY <= 8;

      setVisible((current) => {
        const nextVisible = nearTop || !scrollingDown;
        return current === nextVisible ? current : nextVisible;
      });

      lastScrollY.current = nextScrollY;
    };

    const requestUpdate = () => {
      if (frame.current) return;
      frame.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <div className={`project-title-container${visible ? " is-visible" : " is-hidden"}`}>
      <h1 className="project-title hover-invert is-active">{title}</h1>
    </div>
  );
}
