import { createHash } from "node:crypto";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import { databaseUrl, isDemoPreview } from "./preview-config.mjs";

export const PUBLIC_CACHE_SECONDS = 300;
// Next's Data Cache has a 2 MiB entry limit. Leave room for its JSON envelope.
export const MAX_PUBLIC_CACHE_ENCODED_BYTES = 1_500_000;
const compress = promisify(gzip);
const decompress = promisify(gunzip);

export function publicCacheScope(env: NodeJS.ProcessEnv = process.env): string {
  const source = isDemoPreview(env) ? "demo" : databaseUrl(env) ? "database" : "unconfigured";
  const runtime = env.VERCEL_ENV || env.NODE_ENV || "development";
  // Never include a connection string, endpoint, or password in cache keys/tags.
  return createHash("sha256").update(JSON.stringify([runtime, source, databaseUrl(env)])).digest("hex").slice(0, 24);
}

export function publicCacheTag(resource: "journeys" | "settings", env: NodeJS.ProcessEnv = process.env): string {
  return `portfolio-public-${resource}-${publicCacheScope(env)}`;
}

export class PublicCacheValueTooLarge<T = unknown> extends Error {
  readonly value: T;
  constructor(value: T) {
    super("Public content exceeds the cache entry budget.");
    this.name = "PublicCacheValueTooLarge";
    this.value = value;
  }
}

export async function encodePublicCacheValue<T>(value: T): Promise<string> {
  // The envelope preserves a missing journey (undefined) as a cacheable result.
  const encoded = (await compress(JSON.stringify({ value }))).toString("base64");
  if (encoded.length > MAX_PUBLIC_CACHE_ENCODED_BYTES) throw new PublicCacheValueTooLarge(value);
  return encoded;
}

export async function decodePublicCacheValue<T>(encoded: string): Promise<T> {
  const json = (await decompress(Buffer.from(encoded, "base64"))).toString("utf8");
  return (JSON.parse(json) as { value: T }).value;
}
