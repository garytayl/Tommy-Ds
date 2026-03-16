/**
 * True if the error looks like a transient network failure (connection lost, timeout, load failed).
 */
export function isRetryableNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message?.toLowerCase().includes("fetch")) return true;
  if (error instanceof TypeError && error.message?.toLowerCase().includes("load failed")) return true;
  const msg = String((error as Error)?.message ?? "").toLowerCase();
  if (msg.includes("network") || msg.includes("connection") || msg.includes("load failed")) return true;
  if (msg.includes("failed to fetch") || msg.includes("network request failed")) return true;
  return false;
}

const DEFAULT_DELAY_MS = 1500;
const DEFAULT_ATTEMPTS = 3;

/**
 * Run an async function, retrying on retryable network errors with a short delay.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number;
    delayMs?: number;
    onRetry?: (attempt: number) => void;
  } = {}
): Promise<T> {
  const { attempts = DEFAULT_ATTEMPTS, delayMs = DEFAULT_DELAY_MS, onRetry } = options;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < attempts && isRetryableNetworkError(e)) {
        onRetry?.(attempt);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}
