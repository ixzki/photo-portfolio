"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import ImageLoader from "@/components/ImageLoader";
import type { Image as ProjectImage } from "@/lib/types";

interface DetailImageFrameProps {
  image: ProjectImage;
  alt: string;
  delayIndex: number;
}

export default function DetailImageFrame({ image, alt, delayIndex }: DetailImageFrameProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reveal = () => setInView(true);
    const shouldRevealNow = () => {
      const rect = element.getBoundingClientRect();
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      const initiallyVisibleOnMobile = isPortrait && window.scrollY <= 8 && rect.top < window.innerHeight && rect.bottom > 0;
      const isInRevealBand = rect.top < window.innerHeight * 1.08 && rect.bottom > window.innerHeight * 0.02;

      return initiallyVisibleOnMobile || isInRevealBand;
    };

    if (shouldRevealNow()) {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        reveal();
        observer.disconnect();
      },
      {
        rootMargin: "0px 0px 8% 0px",
        threshold: 0.02,
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <figure
      ref={ref}
      className={`detail-image-frame detail-image-motion${inView ? " is-in-view" : ""}`}
      style={{
        aspectRatio: `${image.width} / ${image.height}`,
        "--detail-reveal-delay": `${Math.min(delayIndex * 90, 450)}ms`,
      } as CSSProperties}
    >
      <ImageLoader
        src={image.url}
        alt={image.alt || alt}
        className="detail-image"
        width={image.width}
        height={image.height}
        sizes="(orientation: portrait) 100vw, 70vw"
      />
    </figure>
  );
}
