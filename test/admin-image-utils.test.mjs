import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { adminPreviewImageUrl, isCompleteHttpUrl } from "../src/lib/admin-image-utils.mjs";

describe("admin image utilities", () => {
  const keys = ["NEXT_PUBLIC_UPYUN_HOSTS", "NEXT_PUBLIC_UPYUN_TRANSFORMS"];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  before(() => { process.env.NEXT_PUBLIC_UPYUN_HOSTS = "cdn.example.com"; process.env.NEXT_PUBLIC_UPYUN_TRANSFORMS = "true"; });
  after(() => {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });
  it("generates a small UpYun preview URL", () => {
    assert.equal(
      adminPreviewImageUrl("https://cdn.example.com/2026/06/18/example.jpg", 320),
      "https://cdn.example.com/2026/06/18/example.jpg!/fw/320/quality/76/format/webp",
    );
  });

  it("replaces existing UpYun processing parameters", () => {
    assert.equal(
      adminPreviewImageUrl("https://cdn.example.com/a/b.jpg!/fw/3840/quality/88/format/webp", 160),
      "https://cdn.example.com/a/b.jpg!/fw/160/quality/76/format/webp",
    );
  });

  it("does not optimize non-UpYun URLs", () => {
    const url = "https://example.com/image.jpg";
    assert.equal(adminPreviewImageUrl(url, 320), url);
  });

  it("only treats complete http URLs as size-detection candidates", () => {
    assert.equal(isCompleteHttpUrl("https://cdn.example.com/a.jpg"), true);
    assert.equal(isCompleteHttpUrl("https://"), false);
    assert.equal(isCompleteHttpUrl("cdn.example.com/a.jpg"), false);
    assert.equal(isCompleteHttpUrl(""), false);
  });
});
