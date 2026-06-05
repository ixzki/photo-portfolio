"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

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
  const imgRef = useRef<HTMLImageElement | null>(null);
  const thumb = thumbUrl(src);
  const imageWidth = width || 1440;
  const imageHeight = height || 960;

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
  const imageStyle = {
    ...style,
    ...(thumb ? { "--thumb": `url(${thumb})` } : {}),
  } as React.CSSProperties;

  const commonProps = {
    ref: imgRef,
    src,
    className: finalClass,
    sizes: sizes || "100vw",
    priority,
    unoptimized: true,
    loading: priority ? "eager" as const : "lazy" as const,
    fetchPriority: priority ? "high" as const : "auto" as const,
    onLoad: () => setLoadedSrc(src),
    onError: () => {
      setErrorSrc(src);
      setLoadedSrc(src);
    },
    style: imageStyle,
    draggable: false,
  };

  return <Image {...commonProps} width={imageWidth} height={imageHeight} alt={alt} />;
}
