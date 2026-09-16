import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { adminPreviewImageUrl } from "../src/lib/admin-image-utils.mjs";
import { getImageRemotePatterns, getUpyunHosts, parseImageHosts } from "../src/lib/image-hosts.mjs";
import { isUpyunImageUrl, toResponsiveImageUrl, toTinyPlaceholderUrl } from "../src/lib/image-variants.ts";

const envKeys = ["NEXT_PUBLIC_UPYUN_HOSTS", "NEXT_PUBLIC_UPYUN_TRANSFORMS"];
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

describe("shared image host configuration", () => {
  beforeEach(() => {
    for (const key of envKeys) delete process.env[key];
  });
  afterEach(() => {
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("has no built-in personal CDN and shares configured hosts across frontend and admin", () => {
    assert.deepEqual(getUpyunHosts(), []);
    process.env.NEXT_PUBLIC_UPYUN_HOSTS = " photo.example.com,PHOTO.EXAMPLE.COM, cdn.example.net ";
    assert.deepEqual(getUpyunHosts(), ["photo.example.com", "cdn.example.net"]);
    for (const host of getUpyunHosts()) {
      const src = `https://${host}/photo.jpg?version=1`;
      assert.equal(isUpyunImageUrl(src), true);
      assert.equal(toResponsiveImageUrl(src, { width: 320, quality: 76 }), adminPreviewImageUrl(src, 320, 76));
      assert.equal(new URL(toResponsiveImageUrl(src, { width: 320 })).pathname, "/photo.jpg!/fw/320/quality/88/format/webp");
    }
  });

  it("keeps signed URLs byte-for-byte and skips tiny downloads when transforms are disabled", () => {
    process.env.NEXT_PUBLIC_UPYUN_HOSTS = "photo.example.com";
    process.env.NEXT_PUBLIC_UPYUN_TRANSFORMS = "false";
    const src = "https://photo.example.com/photo.jpg!/custom?sign=abc%2fDEF&x=hello%20world";
    assert.equal(toResponsiveImageUrl(src, { width: 480 }), src);
    assert.equal(adminPreviewImageUrl(src), src);
    assert.equal(toTinyPlaceholderUrl(src), "");
    assert.equal(isUpyunImageUrl(src), true);
  });

  it("preserves Unsplash resizing while excluding lookalike hosts and URL substrings", () => {
    process.env.NEXT_PUBLIC_UPYUN_TRANSFORMS = "false";
    const src = "https://images.unsplash.com/photo-123?fit=max";
    const url = new URL(toResponsiveImageUrl(src, { width: 480 }));
    assert.equal(url.searchParams.get("w"), "480");
    assert.equal(url.searchParams.get("fit"), "max");
    assert.equal(new URL(toTinyPlaceholderUrl(src)).searchParams.get("w"), "96");
    for (const other of ["https://evilunsplash.com/a.jpg", "https://unsplash.com.evil.test/a.jpg", "https://example.com/unsplash.com/a.jpg", "not a URL", "ftp://cdn.example.com/a.jpg"]) {
      assert.equal(toResponsiveImageUrl(other, { width: 480 }), other);
      assert.equal(toTinyPlaceholderUrl(other), "");
    }
  });

  it("allows only exact HTTPS image hosts including configured external providers", () => {
    process.env.NEXT_PUBLIC_UPYUN_HOSTS = "photo.example.com";
    const patterns = getImageRemotePatterns("assets.example.net,photo.example.com");
    assert.deepEqual(patterns.map((pattern) => pattern.hostname), ["photo.example.com", "images.unsplash.com", "plus.unsplash.com", "assets.example.net"]);
    assert.ok(patterns.every((pattern) => pattern.protocol === "https" && pattern.port === "" && pattern.pathname === "/**"));
    assert.equal(isUpyunImageUrl("https://assets.example.net/a.jpg"), false);
    assert.equal(isUpyunImageUrl("https://photo.example.com.evil.test/a.jpg"), false);
  });

  it("rejects schemes, wildcard hosts, ports and paths instead of widening the allowlist", () => {
    for (const value of ["https://example.com", "*.example.com", "**", "example.com:8443", "example.com/path", "example.com?x=1", "user@example.com", "127.0.0.1", "localhost"]) {
      assert.throws(() => parseImageHosts(value), /Invalid image hostname/);
    }
    assert.deepEqual(parseImageHosts("  , ,"), []);
  });
});
