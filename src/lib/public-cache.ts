import { unstable_cache } from "next/cache";
import {
  decodePublicCacheValue, encodePublicCacheValue, PUBLIC_CACHE_SECONDS,
  publicCacheScope, publicCacheTag, PublicCacheValueTooLarge,
} from "./public-cache-policy";

/** Only public data belongs here; authenticated editor reads must stay uncached. */
export async function readPublicCached<T>(
  resource: "journeys" | "settings", key: string, read: () => Promise<T>,
): Promise<T> {
  const cached = unstable_cache(
    async () => encodePublicCacheValue(await read()),
    ["portfolio-public-v1", publicCacheScope(), resource, key],
    { revalidate: PUBLIC_CACHE_SECONDS, tags: [publicCacheTag(resource)] },
  );
  try {
    return await decodePublicCacheValue<T>(await cached());
  } catch (error) {
    // Very large, incompressible documents remain readable without a failed
    // Next cache write or a second database query. Database errors still throw.
    if (error instanceof PublicCacheValueTooLarge) return error.value as T;
    throw error;
  }
}
