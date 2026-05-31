"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DetailNextActionProps {
  nextProject: {
    slug: string;
    titleZh: string;
  };
}

export default function DetailNextAction({ nextProject }: DetailNextActionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    const updateVisibility = () => {
      frame = 0;
      const content = document.querySelector<HTMLElement>(".detail-content");
      const shouldShow = Boolean(content && content.getBoundingClientRect().top <= 0);
      setVisible((current) => (current === shouldShow ? current : shouldShow));
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateVisibility);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <Link
      className={`detail-next-action hover-invert${visible ? " is-visible" : ""}`}
      href={`/works/${nextProject.slug}`}
      aria-label={`下一个项目：${nextProject.titleZh}`}
      aria-hidden={!visible}
      tabIndex={visible ? undefined : -1}
    >
      &gt;
    </Link>
  );
}
