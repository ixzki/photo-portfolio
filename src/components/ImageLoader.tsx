"use client";

import { useState, useEffect, useRef } from "react";

interface ImageLoaderProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
}

export default function ImageLoader({ src, alt, className = "", priority = false, style }: ImageLoaderProps) {
  // Priority images start visible immediately - no fade-in
  const [loadedSrc, setLoadedSrc] = useState(priority ? src : "");
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority) return; // Already visible, skip
    const img = imgRef.current;
    if (!img) return;

    if (img.complete && img.naturalWidth > 0) {
      setLoadedSrc(src);
      return;
    }

    const handleLoad = () => setLoadedSrc(src);
    const handleError = () => setLoadedSrc(src);
    img.addEventListener("load", handleLoad);
    img.addEventListener("error", handleError);
    return () => {
      img.removeEventListener("load", handleLoad);
      img.removeEventListener("error", handleError);
    };
  }, [src, priority]);

  const finalClass = priority ? `${className} loaded` : `${className}${loadedSrc === src ? " loaded" : ""}`;

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={finalClass}
      loading={priority ? "eager" : "lazy"}
      style={style}
      draggable={false}
    />
  );
}
