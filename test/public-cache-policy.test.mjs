import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import {
  publicCacheScope, publicCacheTag, encodePublicCacheValue, decodePublicCacheValue,
  MAX_PUBLIC_CACHE_ENCODED_BYTES, PublicCacheValueTooLarge,
} from "../src/lib/public-cache-policy.ts";

test("public caches are separated by deployment, database and demo source without exposing credentials", () => {
  const database = "postgres://user:secret@example.neon.tech/db";
  const development = { NODE_ENV: "development", DATABASE_URL: database };
  const scopes = [
    development,
    { ...development, NODE_ENV: "production" },
    { ...development, VERCEL_ENV: "preview" },
    { ...development, DATABASE_URL: database.replace("/db", "/other") },
    { NODE_ENV: "development", PREVIEW_DEMO: "true" },
    { NODE_ENV: "development" },
  ].map(publicCacheScope);
  assert.equal(new Set(scopes).size, scopes.length);
  assert.equal(publicCacheScope(development), publicCacheScope({ NODE_ENV: "development", POSTGRES_URL: database }));
  const tag = publicCacheTag("journeys", development);
  assert(tag.length < 256);
  assert(!/secret|example|postgres|user/.test(tag));
  assert.notEqual(tag, publicCacheTag("settings", development));
});

test("compressed public data preserves Unicode, geometry, metadata and missing journeys", async () => {
  const content = {
    title: "西北环线2025", segments: [[[40.1234567, 94.8765432], [40, 95]]],
    pointMeta: [{ time: 1759114800, altitude: -100.3 }, { time: null, altitude: null }],
    markdown: "[敦煌](https://img.ixzki.com/a.jpg)\n\n你好 ✈️",
  };
  assert.deepEqual(await decodePublicCacheValue(await encodePublicCacheValue(content)), content);
  assert.equal(await decodePublicCacheValue(await encodePublicCacheValue(undefined)), undefined);
  assert.deepEqual(await decodePublicCacheValue(await encodePublicCacheValue([])), []);
});

test("a route near the 3.5 MB upload limit fits the Next cache after compression", async () => {
  const content = { title: "大型路线", stops: [], segments: [Array.from({ length: 100_000 }, (_, index) => [40 + index / 10000000, 94 + index / 10000000])] };
  const size = Buffer.byteLength(JSON.stringify(content));
  assert(size > 2_000_000 && size < 3_500_000);
  const encoded = await encodePublicCacheValue(content);
  assert(encoded.length < MAX_PUBLIC_CACHE_ENCODED_BYTES);
  assert.deepEqual(await decodePublicCacheValue(encoded), content);
});

test("oversized incompressible content returns its already-read value for uncached fallback", async () => {
  const content = { markdown: randomBytes(1_700_000).toString("base64") };
  await assert.rejects(encodePublicCacheValue(content), (error) => {
    assert(error instanceof PublicCacheValueTooLarge);
    assert.equal(error.value, content);
    assert(!error.message.includes(content.markdown.slice(0, 40)));
    return true;
  });
});

test("corrupt compressed entries throw rather than silently restore sample data", async () => {
  await assert.rejects(decodePublicCacheValue("not a gzip value"));
});
