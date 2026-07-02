export function shouldRetryDatabaseError(error: unknown): boolean;

export function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options?: { retries?: number; delayMs?: number },
): Promise<T>;

export function isRetryableReadQuery(query: unknown): boolean;
