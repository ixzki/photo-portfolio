export type ImageVariant = "thumb" | "feature" | "detail" | "cover" | "avatar";

const UPYUN_HOSTS = new Set(["img.ixzki.com", "upyun.ixzki.com"]);

const VARIANT_QUALITY: Record<ImageVariant, number> = {
  thumb: 82,
  feature: 86,
  detail: 88,
  cover: 88,
  avatar: 86,
};

function safeWidth(width: number): number {
  if (!Number.isFinite(width)) return 1920;
  return Math.max(24, Math.round(width));
}

function clampQuality(quality: number): number {
  if (!Number.isFinite(quality)) return 86;
  return Math.min(95, Math.max(1, Math.round(quality)));
}

function stripUpyunProcessing(pathname: string): string {
  const processingIndex = pathname.indexOf("!");
  return processingIndex >= 0 ? pathname.slice(0, processingIndex) : pathname;
}

export function getImageVariantQuality(variant: ImageVariant): number {
  return VARIANT_QUALITY[variant];
}

export function isUpyunImageUrl(src: string): boolean {
  try {
    return UPYUN_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

export function toResponsiveImageUrl(
  src: string,
  {
    width,
    quality,
    variant = "detail",
  }: {
    width: number;
    quality?: number;
    variant?: ImageVariant;
  },
): string {
  const targetWidth = safeWidth(width);
  const targetQuality = clampQuality(quality ?? getImageVariantQuality(variant));

  try {
    const url = new URL(src);

    if (UPYUN_HOSTS.has(url.hostname)) {
      url.pathname = `${stripUpyunProcessing(url.pathname)}!/fw/${targetWidth}/quality/${targetQuality}/format/webp`;
      return url.toString();
    }

    if (url.hostname.includes("unsplash.com")) {
      url.searchParams.set("auto", "format");
      url.searchParams.set("fit", url.searchParams.get("fit") || "crop");
      url.searchParams.set("w", String(targetWidth));
      url.searchParams.set("q", String(targetQuality));
      return url.toString();
    }
  } catch {}

  return src;
}

export function toTinyPlaceholderUrl(src: string): string {
  if (!isUpyunImageUrl(src) && !src.includes("unsplash.com")) return "";
  return toResponsiveImageUrl(src, { width: 48, quality: 24, variant: "thumb" });
}
