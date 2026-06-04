"use client";

import { useState, useEffect, useRef } from "react";

interface ImageLoaderProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  style?: React.CSSProperties;
}

function resizedUrl(src: string, width: number, quality: number): string {
  try {
    const url = new URL(src);
    if (url.hostname.includes("unsplash.com")) {
      url.searchParams.set("auto", "format");
      url.searchParams.set("fit", url.searchParams.get("fit") || "crop");
      url.searchParams.set("w", String(width));
      url.searchParams.set("q", String(quality));
      return url.toString();
    }
  } catch {}
  return "";
}

/** Generate a tiny placeholder URL for LQIP */
function thumbUrl(src: string): string {
  return resizedUrl(src, 24, 10);
}

function responsiveSrcSet(src: string): string | undefined {
  const widths = [480, 768, 1080, 1440, 1920, 2560, 3200];
  const urls = widths
    .map((width) => {
      const url = resizedUrl(src, width, 82);
      return url ? `${url} ${width}w` : "";
    })
    .filter(Boolean);

  return urls.length ? urls.join(", ") : undefined;
}

export default function ImageLoader({
  src,
  alt,
  className = "",
  priority = false,
  width,
  height,
  sizes,
  style,
}: ImageLoaderProps) {
  const [loadedSrc, setLoadedSrc] = useState(priority ? src : "");
  const [errorSrc, setErrorSrc] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const thumb = thumbUrl(src);
  const srcSet = responsiveSrcSet(src);

  useEffect(() => {
    if (priority) return;
    const img = imgRef.current;
    if (!img) return;

    if (img.complete && img.naturalWidth > 0) {
      setLoadedSrc(src);
      return;
    }

    const done = () => setLoadedSrc(src);
    const failed = () => {
      setErrorSrc(src);
      setLoadedSrc(src);
    };
    img.addEventListener("load", done);
    img.addEventListener("error", failed);
    return () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", failed);
    };
  }, [src, priority]);

  const loaded = priority || loadedSrc === src;
  const errored = errorSrc === src;
  const finalClass = `${className}${loaded ? " loaded" : ""}${errored ? " image-error" : ""}`;

  return (
    <img
      ref={imgRef}
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes || "100vw" : undefined}
      alt={alt}
      className={finalClass}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      style={{
        ...style,
        ...(thumb ? { "--thumb": `url(${thumb})` } : {}),
      } as React.CSSProperties}
      draggable={false}
    />
  );
}
