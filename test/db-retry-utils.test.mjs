import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldRetryDatabaseError, withDatabaseRetry } from "../src/lib/db-retry-utils.mjs";

describe("database retry utilities", () => {
  it("retries transient Neon fetch failures", async () => {
    let attempts = 0;
    const result = await withDatabaseRetry(async () => {
      attempts += 1;
      if (attempts < 3) {
        const cause = Object.assign(new Error("Client network socket disconnected"), { code: "ECONNRESET" });
        const sourceError = Object.assign(new TypeError("fetch failed"), { cause });
        throw { sourceError };
      }
      return "ok";
    }, { retries: 2, delayMs: 1 });

    assert.equal(result, "ok");
    assert.equal(attempts, 3);
  });

  it("does not retry non-transient database errors", async () => {
    let attempts = 0;
    await assert.rejects(
      () => withDatabaseRetry(async () => {
        attempts += 1;
        throw Object.assign(new Error("relation does not exist"), { code: "42P01" });
      }, { retries: 2, delayMs: 1 }),
      /relation does not exist/,
    );

    assert.equal(attempts, 1);
  });

  it("recognizes connect timeout errors as transient", () => {
    assert.equal(shouldRetryDatabaseError({ cause: { code: "UND_ERR_CONNECT_TIMEOUT" } }), true);
  });
});
