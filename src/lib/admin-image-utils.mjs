const UPYUN_HOSTS = new Set(["img.ixzki.com", "upyun.ixzki.com"]);

function safeWidth(width) {
  if (!Number.isFinite(width)) return 320;
  return Math.max(24, Math.round(width));
}

function safeQuality(quality) {
  if (!Number.isFinite(quality)) return 76;
  return Math.min(95, Math.max(1, Math.round(quality)));
}

function stripUpyunProcessing(pathname) {
  const processingIndex = pathname.indexOf("!");
  return processingIndex >= 0 ? pathname.slice(0, processingIndex) : pathname;
}

export function isCompleteHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function adminPreviewImageUrl(src, width = 320, quality = 76) {
  if (!isCompleteHttpUrl(src)) return src;

  const targetWidth = safeWidth(width);
  const targetQuality = safeQuality(quality);
  const url = new URL(src.trim());

  if (!UPYUN_HOSTS.has(url.hostname)) return src;

  url.pathname = `${stripUpyunProcessing(url.pathname)}!/fw/${targetWidth}/quality/${targetQuality}/format/webp`;
  return url.toString();
}
