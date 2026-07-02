"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { ImageLoaderProps as NextImageLoaderProps } from "next/image";
import {
  getImageVariantQuality,
  toResponsiveImageUrl,
  toTinyPlaceholderUrl,
  type ImageVariant,
} from "@/lib/image-variants";

interface ImageLoaderProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  style?: React.CSSProperties;
  variant?: ImageVariant;
  quality?: number;
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
  variant = "detail",
  quality,
}: ImageLoaderProps) {
  const [loadedSrc, setLoadedSrc] = useState("");
  const [errorSrc, setErrorSrc] = useState("");
  const imgRef = useRef<HTMLImageElement | null>(null);
  const thumb = toTinyPlaceholderUrl(src);
  const imageWidth = width || 1440;
  const imageHeight = height || 960;
  const imageQuality = quality ?? getImageVariantQuality(variant);
  const imageLoader = ({ src: loaderSrc, width: loaderWidth, quality: loaderQuality }: NextImageLoaderProps) =>
    toResponsiveImageUrl(loaderSrc, {
      width: loaderWidth,
      quality: loaderQuality ?? imageQuality,
      variant,
    });

  useEffect(() => {
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
  }, [src]);

  const loaded = loadedSrc === src;
  const errored = errorSrc === src;
  const finalClass = `${className}${loaded ? " loaded" : ""}${errored ? " image-error" : ""}`;
  const imageStyle = {
    ...style,
    ...(thumb ? { "--thumb": `url(${thumb})` } : {}),
  } as React.CSSProperties;

  const commonProps = {
    ref: imgRef,
    src,
    loader: imageLoader,
    className: finalClass,
    sizes: sizes || "100vw",
    priority,
    quality: imageQuality,
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
