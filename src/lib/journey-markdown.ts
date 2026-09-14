import { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

export function normalizeJourneyImageUrl(value: string) {
  return value.replace(/^(https?:)?\/\/upyun\.ixzki\.com(?=[/:?#]|$)/i, "$1//img.ixzki.com");
}

export function journeyMarkdownUrl(value: string, key: string) {
  const normalized = normalizeJourneyImageUrl(value.trim());
  const safe = defaultUrlTransform(normalized);
  if (key === "src") {
    // Remote pictures and local public assets are supported; executable and inline data URLs are not.
    if (!/^https?:\/\//i.test(safe) && !/^\/(?!\/)/.test(safe)) return "";
  }
  return safe;
}

export const journeyMarkdownOptions = {
  skipHtml: true,
  remarkPlugins: [remarkGfm],
  urlTransform: journeyMarkdownUrl,
};
