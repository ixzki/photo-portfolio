export class TravelRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.name = "TravelRequestError"; this.status = status; }
}

/** Cookie authentication must not authorize a write initiated by a different site. */
export function assertTravelWriteRequest(request: Request): void {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  const target = new URL(request.url);
  // Next's local request URL may use localhost while the browser uses 127.0.0.1.
  // Host is the browser's actual destination; do not trust arbitrary forwarded-host headers.
  const host = request.headers.get("host");
  if (host) target.host = host;
  if ((origin !== null && origin !== target.origin) ||
      (site !== null && !["same-origin", "none"].includes(site)) ||
      (origin === null && site !== "same-origin")) {
    throw new TravelRequestError("请从当前网站后台保存旅行，已拒绝跨站写入。", 403);
  }
}

/** Count streamed bytes as well as Content-Length; clients can omit or forge that header. */
export async function readTravelJson(request: Request, maximumBytes: number): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new TravelRequestError("请求需要使用 JSON 格式。", 400);
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > maximumBytes) {
    throw new TravelRequestError("旅行内容过大，请缩小 CSV 时间范围或简化路线后保存。", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new TravelRequestError("请求内容为空。", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.byteLength;
      if (length > maximumBytes) {
        await reader.cancel();
        throw new TravelRequestError("旅行内容过大，请缩小 CSV 时间范围或简化路线后保存。", 413);
      }
      chunks.push(result.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw new TravelRequestError("JSON 内容不完整或编码不正确。", 400); }
  } finally { reader.releaseLock(); }
}
