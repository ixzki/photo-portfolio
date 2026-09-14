import assert from "node:assert/strict";
import test from "node:test";
import { assertTravelWriteRequest, readTravelJson } from "../src/lib/travel-request.ts";

const endpoint = "https://portfolio.example/api/travel";

test("travel writes require a same-origin request, including sibling subdomain protection", () => {
  assert.doesNotThrow(() => assertTravelWriteRequest(new Request(endpoint, { headers: { origin: "https://portfolio.example" } })));
  assert.doesNotThrow(() => assertTravelWriteRequest(new Request(endpoint, { headers: { "sec-fetch-site": "same-origin" } })));
  assert.doesNotThrow(() => assertTravelWriteRequest(new Request("http://localhost:3100/api/travel", { headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" } })));
  for (const headers of [
    {}, { origin: "null" }, { origin: "https://other.example" },
    { origin: "https://portfolio.example", "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "same-site" },
  ]) assert.throws(() => assertTravelWriteRequest(new Request(endpoint, { headers })), (error) => error.status === 403);
});

test("request JSON limits count UTF-8 bytes even when Content-Length is absent or forged", async () => {
  const body = JSON.stringify({ text: "旅行" });
  const bytes = Buffer.byteLength(body);
  const request = (headers = {}) => new Request(endpoint, { method: "POST", headers: { "content-type": "application/json; charset=utf-8", ...headers }, body });
  assert.deepEqual(await readTravelJson(request(), bytes), { text: "旅行" });
  await assert.rejects(readTravelJson(request(), bytes - 1), (error) => error.status === 413);
  await assert.rejects(readTravelJson(request({ "content-length": "1" }), bytes - 1), (error) => error.status === 413);
  await assert.rejects(readTravelJson(request({ "content-length": "9999" }), bytes), (error) => error.status === 413);
});

test("malformed JSON and unsupported content types return a controlled validation error", async () => {
  for (const [type, body] of [["text/plain", "{}"], ["application/json", "{"], ["application/json", new Uint8Array([255])]]) {
    const request = new Request(endpoint, { method: "POST", headers: { "content-type": type }, body });
    await assert.rejects(readTravelJson(request, 100), (error) => error.status === 400);
  }
});
