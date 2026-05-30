"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import ImageLoader from "./ImageLoader";
import { FeatureItem } from "@/lib/types";

export default function FeatureStrip({ features }: { features: FeatureItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Only transform vertical scroll to horizontal in landscape
      if (!window.matchMedia("(orientation: landscape)").matches) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <section className="view home-page is-active" id="home" data-view="home" aria-label="首页精选">
      <div className="features" ref={containerRef}>
        {features.map((item) => {
          const imgUrl = item.type === "project" ? item.projectCoverUrl! : item.imageUrl!;
          const title = item.type === "project" ? item.projectTitle! : item.imageTitle!;
          const href = item.type === "project" ? `/works/${item.projectSlug}` : "#";
          const isImageOnly = item.type === "image";

          return (
            <Link
              key={item.id}
              className="features-item"
              href={href}
              aria-label={item.type === "project" ? `查看项目：${title}` : title || ""}
              {...(isImageOnly ? { onClick: (e: React.MouseEvent) => e.preventDefault() } : {})}
            >
              <div className="features-image-container">
                <ImageLoader
                  src={imgUrl}
                  alt={title || ""}
                  className="features-image"
                  priority={item.order === 0}
                />
                <div className="features-title">{title} &gt;&gt;</div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
