/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ECONNREFUSED",
    "rate limit",
    "timeout",
    "Service unavailable",
  ],
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  const errorMessage = error?.message || error?.toString() || "";
  return retryableErrors.some((err) =>
    errorMessage.toLowerCase().includes(err.toLowerCase())
  );
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts!; attempt++) {
    try {
      console.log(`[Retry] Attempt ${attempt}/${opts.maxAttempts}`);
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`[Retry] Attempt ${attempt} failed:`, error);

      // Check if this is the last attempt
      if (attempt === opts.maxAttempts) {
        console.error(`[Retry] All ${opts.maxAttempts} attempts failed`);
        throw error;
      }

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors!)) {
        console.log("[Retry] Error is not retryable, throwing immediately");
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay! * Math.pow(opts.backoffMultiplier!, attempt - 1),
        opts.maxDelay!
      );

      console.log(`[Retry] Waiting ${delay}ms before next attempt...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry configuration for specific operations
 */
export const RETRY_CONFIGS = {
  GEMINI_API: {
    maxAttempts: 3,
    initialDelay: 1000,
    retryableErrors: [
      "rate limit",
      "timeout",
      "Service unavailable",
      "ECONNRESET",
      "503",
      "429",
    ],
  },
  TRANSLATION: {
    maxAttempts: 2,
    initialDelay: 500,
    retryableErrors: ["timeout", "ECONNRESET"],
  },
  FILE_SEARCH: {
    maxAttempts: 3,
    initialDelay: 1000,
    retryableErrors: ["timeout", "Service unavailable", "503"],
  },
};
