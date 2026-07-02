const TRANSIENT_ERROR_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

const TRANSIENT_MESSAGE_PARTS = [
  "fetch failed",
  "connect timeout",
  "socket disconnected",
  "network socket disconnected",
  "secure tls connection",
];

function collectErrorChain(error) {
  const chain = [];
  const seen = new Set();
  let current = error;

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = current.sourceError || current.cause;
  }

  return chain;
}

export function shouldRetryDatabaseError(error) {
  return collectErrorChain(error).some((item) => {
    const code = typeof item.code === "string" ? item.code : "";
    if (TRANSIENT_ERROR_CODES.has(code)) return true;

    const message = typeof item.message === "string" ? item.message.toLowerCase() : "";
    return TRANSIENT_MESSAGE_PARTS.some((part) => message.includes(part));
  });
}

export async function withDatabaseRetry(operation, options = {}) {
  const retries = Number.isFinite(options.retries) ? options.retries : 2;
  const delayMs = Number.isFinite(options.delayMs) ? options.delayMs : 120;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !shouldRetryDatabaseError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
}

export function isRetryableReadQuery(query) {
  if (typeof query !== "string") return false;
  const normalized = query.trim().toLowerCase();
  return normalized.startsWith("select ") || normalized.startsWith("with ");
}
