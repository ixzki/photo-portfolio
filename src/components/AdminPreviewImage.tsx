import Image from "next/image";

interface AdminPreviewImageProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  draggable?: boolean;
}

export default function AdminPreviewImage({
  src,
  alt = "",
  className = "loaded",
  width = 320,
  height = 240,
  sizes = "320px",
  draggable = false,
}: AdminPreviewImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      sizes={sizes}
      unoptimized
      draggable={draggable}
    />
  );
}
