import { test } from "node:test";
import assert from "node:assert/strict";
import { databaseUrl, isDemoPreview, isReadOnlyPreview, isPreviewWriteBlocked } from "../src/lib/preview-config.mjs";

test("demo requires explicit opt-in and is disabled on Vercel", () => {
  assert.equal(isDemoPreview({}), false);
  assert.equal(isDemoPreview({ PREVIEW_DEMO: "true" }), true);
  assert.equal(isDemoPreview({ PREVIEW_DEMO: "true", VERCEL: "1" }), false);
});
test("a configured database always takes precedence over demo, even if broken", () => {
  for (const name of ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"]) {
    assert.equal(isDemoPreview({ PREVIEW_DEMO: "true", [name]: "postgres://configured" }), false);
  }
  assert.equal(databaseUrl({ DATABASE_URL: "primary", POSTGRES_URL: "fallback" }), "primary");
});
test("demo is always read-only, while a Neon development branch may allow writes", () => {
  assert.equal(isReadOnlyPreview({ PREVIEW_DEMO: "true", PREVIEW_READ_ONLY: "false" }), true);
  assert.equal(isReadOnlyPreview({ DATABASE_URL: "postgres://dev", PREVIEW_READ_ONLY: "false" }), false);
  assert.equal(isReadOnlyPreview({ DATABASE_URL: "postgres://live", PREVIEW_READ_ONLY: "true" }), true);
  assert.equal(isReadOnlyPreview({ VERCEL: "1" }), false);
});

test("read-only previews block every data mutation while retaining login and reads", () => {
  for (const path of ["/api/projects", "/api/media", "/api/settings", "/api/features", "/api/features/reorder"]) {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      assert.equal(isPreviewWriteBlocked(path, method, {PREVIEW_READ_ONLY: "true"}), true);
      assert.equal(isPreviewWriteBlocked(path, method, {DATABASE_URL: "postgres://dev", PREVIEW_READ_ONLY: "false"}), false);
    }
    for (const method of ["GET", "HEAD", "OPTIONS"]) assert.equal(isPreviewWriteBlocked(path, method, {PREVIEW_READ_ONLY: "true"}), false);
  }
  assert.equal(isPreviewWriteBlocked("/api/auth", "POST", {PREVIEW_READ_ONLY: "true"}), false);
  assert.equal(isPreviewWriteBlocked("/api/auth/other", "POST", {PREVIEW_READ_ONLY: "true"}), true);
});
