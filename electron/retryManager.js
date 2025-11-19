/**
 * Retry Manager: Handles retry logic with exponential backoff for rate-limited requests
 */

class RetryManager {
  constructor() {
    this.retryState = new Map(); // key -> { lastError, retryCount, resetTime }
    this.defaultMaxRetries = 3;
    this.defaultInitialDelay = 1000; // ms
    this.defaultMaxDelay = 30000; // ms
  }

  /**
   * Generate a backoff delay with exponential growth
   * @param {number} retryCount - Current retry attempt (0-indexed)
   * @param {number} initialDelay - Base delay in milliseconds
   * @param {number} maxDelay - Maximum delay cap in milliseconds
   * @returns {number} Delay in milliseconds
   */
  getBackoffDelay(retryCount, initialDelay = this.defaultInitialDelay, maxDelay = this.defaultMaxDelay) {
    const delay = initialDelay * Math.pow(2, retryCount);
    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.min(maxDelay, Math.max(initialDelay, delay + jitter));
  }

  /**
   * Check if a request should be retried based on status code and error
   * @param {number} statusCode - HTTP status code
   * @param {Error} error - Error object
   * @returns {boolean} Whether to retry
   */
  shouldRetry(statusCode, error) {
    // Retry on rate limit (429), server errors (5xx), and timeouts
    if (statusCode === 429 || statusCode === 408 || (statusCode >= 500 && statusCode < 600)) {
      return true;
    }

    // Also retry on network errors
    if (error) {
      const message = error.message || '';
      if (message.includes('timeout') || message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract retry-after value from response headers
   * @param {Response} response - Fetch response object
   * @returns {number|null} Seconds to wait, or null if not specified
   */
  getRetryAfter(response) {
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) {
      // Could be seconds (number) or HTTP date
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000; // Convert to ms
      }
      // Try parsing as date
      const date = new Date(retryAfter);
      if (!isNaN(date.getTime())) {
        return Math.max(0, date.getTime() - Date.now());
      }
    }
    return null;
  }

  /**
   * Execute a fetch request with automatic retry on rate limit / server errors
   * @param {string} url - URL to fetch
   * @param {object} fetchOptions - Options for fetch
   * @param {object} retryOptions - { maxRetries, initialDelay, maxDelay }
   * @returns {Promise<Response>} The response
   */
  async fetchWithRetry(url, fetchOptions = {}, retryOptions = {}) {
    const maxRetries = retryOptions.maxRetries ?? this.defaultMaxRetries;
    const initialDelay = retryOptions.initialDelay ?? this.defaultInitialDelay;
    const maxDelay = retryOptions.maxDelay ?? this.defaultMaxDelay;

    let lastError;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        const response = await fetch(url, fetchOptions);

        // If successful, return immediately
        if (response.ok) {
          return response;
        }

        // Check if we should retry
        if (!this.shouldRetry(response.status, null)) {
          // Don't retry on client errors (4xx except 408/429)
          return response;
        }

        // We will retry - but not if we've exceeded max retries
        if (retryCount >= maxRetries) {
          return response; // Return the failed response
        }

        // Calculate delay: use Retry-After header if available, else exponential backoff
        let delay = this.getRetryAfter(response);
        if (delay === null) {
          delay = this.getBackoffDelay(retryCount, initialDelay, maxDelay);
        }

        console.warn(
          `[RetryManager] HTTP ${response.status} on ${url}. Retrying in ${Math.round(delay / 1000)}s (attempt ${retryCount + 1}/${maxRetries})`
        );

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      } catch (error) {
        lastError = error;

        // Network error - check if we should retry
        if (!this.shouldRetry(0, error)) {
          throw error;
        }

        if (retryCount >= maxRetries) {
          throw error; // Exceeded max retries
        }

        const delay = this.getBackoffDelay(retryCount, initialDelay, maxDelay);
        console.warn(
          `[RetryManager] Network error: ${error.message}. Retrying in ${Math.round(delay / 1000)}s (attempt ${retryCount + 1}/${maxRetries})`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }

    // Should not reach here, but just in case
    if (lastError) throw lastError;
    throw new Error('Max retries exceeded');
  }

  /**
   * Track retry state for a specific key (e.g., API endpoint)
   * Useful for adaptive rate limiting across multiple requests
   */
  recordError(key, statusCode, error) {
    if (!this.retryState.has(key)) {
      this.retryState.set(key, { retryCount: 0, lastError: null, resetTime: 0 });
    }

    const state = this.retryState.get(key);
    state.lastError = error;
    state.retryCount++;

    // If 429, set reset time to now + 60 seconds
    if (statusCode === 429) {
      state.resetTime = Date.now() + 60000;
    }
  }

  isBackoffActive(key) {
    const state = this.retryState.get(key);
    return state && state.resetTime > Date.now();
  }

  clearRetryState(key) {
    this.retryState.delete(key);
  }

  clearAllRetryState() {
    this.retryState.clear();
  }
}

export { RetryManager };
