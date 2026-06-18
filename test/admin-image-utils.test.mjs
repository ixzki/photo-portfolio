import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminPreviewImageUrl, isCompleteHttpUrl } from "../src/lib/admin-image-utils.mjs";

describe("admin image utilities", () => {
  it("generates a small UpYun preview URL", () => {
    assert.equal(
      adminPreviewImageUrl("https://img.ixzki.com/2026/06/18/example.jpg", 320),
      "https://img.ixzki.com/2026/06/18/example.jpg!/fw/320/quality/76/format/webp",
    );
  });

  it("replaces existing UpYun processing parameters", () => {
    assert.equal(
      adminPreviewImageUrl("https://img.ixzki.com/a/b.jpg!/fw/3840/quality/88/format/webp", 160),
      "https://img.ixzki.com/a/b.jpg!/fw/160/quality/76/format/webp",
    );
  });

  it("does not optimize non-UpYun URLs", () => {
    const url = "https://example.com/image.jpg";
    assert.equal(adminPreviewImageUrl(url, 320), url);
  });

  it("only treats complete http URLs as size-detection candidates", () => {
    assert.equal(isCompleteHttpUrl("https://img.ixzki.com/a.jpg"), true);
    assert.equal(isCompleteHttpUrl("https://"), false);
    assert.equal(isCompleteHttpUrl("img.ixzki.com/a.jpg"), false);
    assert.equal(isCompleteHttpUrl(""), false);
  });
});
