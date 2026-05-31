"use client";

import { useState, useEffect, useRef } from "react";

interface ImageLoaderProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
}

/** Generate a tiny 20px-wide placeholder URL for LQIP */
function thumbUrl(src: string): string {
  try {
    const url = new URL(src);
    if (url.hostname.includes("unsplash.com")) {
      url.searchParams.set("w", "20");
      url.searchParams.set("q", "10");
      return url.toString();
    }
  } catch {}
  return "";
}

export default function ImageLoader({ src, alt, className = "", priority = false, style }: ImageLoaderProps) {
  const [loadedSrc, setLoadedSrc] = useState(priority ? src : "");
  const imgRef = useRef<HTMLImageElement>(null);
  const thumb = thumbUrl(src);

  useEffect(() => {
    if (priority) return;
    const img = imgRef.current;
    if (!img) return;

    if (img.complete && img.naturalWidth > 0) {
      setLoadedSrc(src);
      return;
    }

    const done = () => setLoadedSrc(src);
    img.addEventListener("load", done);
    img.addEventListener("error", done);
    return () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
    };
  }, [src, priority]);

  const loaded = priority || loadedSrc === src;
  const finalClass = `${className}${loaded ? " loaded" : ""}`;

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={finalClass}
      loading={priority ? "eager" : "lazy"}
      style={{
        ...style,
        ...(thumb ? { "--thumb": `url(${thumb})` } : {}),
      } as React.CSSProperties}
      draggable={false}
    />
  );
}
