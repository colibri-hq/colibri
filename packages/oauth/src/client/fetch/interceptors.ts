/**
 * Request interceptor function
 *
 * Called before each request is made. Can modify the request or throw
 * to cancel the request.
 */
export type RequestInterceptor = (request: Request) => Request | Promise<Request>;

/**
 * Response interceptor function
 *
 * Called after each response is received. Can modify the response or throw
 * to trigger error handling.
 */
export type ResponseInterceptor = (
  response: Response,
  request: Request,
) => Response | Promise<Response>;

/**
 * Interceptor manager for handling request and response interceptors
 */
export class InterceptorManager {
  readonly #requestInterceptors: RequestInterceptor[] = [];
  readonly #responseInterceptors: ResponseInterceptor[] = [];

  /**
   * Add a request interceptor
   *
   * @param interceptor The interceptor function
   * @returns A function to remove the interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.#requestInterceptors.push(interceptor);

    return () => {
      const index = this.#requestInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.#requestInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add a response interceptor
   *
   * @param interceptor The interceptor function
   * @returns A function to remove the interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.#responseInterceptors.push(interceptor);

    return () => {
      const index = this.#responseInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.#responseInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Run all request interceptors on a request
   */
  async runRequestInterceptors(request: Request): Promise<Request> {
    let current = request;

    for (const interceptor of this.#requestInterceptors) {
      current = await interceptor(current);
    }

    return current;
  }

  /**
   * Run all response interceptors on a response
   */
  async runResponseInterceptors(response: Response, request: Request): Promise<Response> {
    let current = response;

    for (const interceptor of this.#responseInterceptors) {
      current = await interceptor(current, request);
    }

    return current;
  }
}

// region Built-in Interceptors

/**
 * Create a logging interceptor for debugging
 *
 * @param logger The logging function (default: console.log)
 * @returns Request and response interceptors
 */
export function createLoggingInterceptors(
  logger: (message: string, data?: unknown) => void = console.log,
): { request: RequestInterceptor; response: ResponseInterceptor } {
  return {
    request: (request) => {
      logger(`[OAuth Fetch] Request: ${request.method} ${request.url}`);
      return request;
    },
    response: (response, request) => {
      logger(`[OAuth Fetch] Response: ${response.status} ${request.url}`, {
        status: response.status,
        statusText: response.statusText,
      });
      return response;
    },
  };
}

/**
 * Create a retry interceptor for failed requests
 *
 * @param options Retry options
 * @returns A response interceptor that retries on certain status codes
 */
export function createRetryInterceptor(options: {
  /**
   * Maximum number of retries
   * @default 3
   */
  maxRetries?: number;

  /**
   * Status codes to retry on
   * @default [408, 429, 500, 502, 503, 504]
   */
  retryStatusCodes?: number[];

  /**
   * Delay between retries (ms)
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Use exponential backoff
   * @default true
   */
  exponentialBackoff?: boolean;

  /**
   * Custom fetch function for retries
   */
  fetch?: typeof globalThis.fetch;
}): ResponseInterceptor {
  const {
    maxRetries = 3,
    retryStatusCodes = [408, 429, 500, 502, 503, 504],
    retryDelay = 1000,
    exponentialBackoff = true,
    fetch = globalThis.fetch,
  } = options;

  const retryCount = new WeakMap<Request, number>();

  return async (response, request) => {
    // Don't retry successful responses
    if (!retryStatusCodes.includes(response.status)) {
      return response;
    }

    // Get current retry count
    const count = retryCount.get(request) ?? 0;

    // Max retries reached
    if (count >= maxRetries) {
      return response;
    }

    // Calculate delay
    const delay = exponentialBackoff ? retryDelay * Math.pow(2, count) : retryDelay;

    // Check for Retry-After header
    const retryAfter = response.headers.get("Retry-After");
    const actualDelay = retryAfter ? parseInt(retryAfter, 10) * 1000 || delay : delay;

    // Wait before retry
    await new Promise((resolve) => setTimeout(resolve, actualDelay));

    // Clone request for retry (request body can only be consumed once)
    const clonedRequest = request.clone();
    retryCount.set(clonedRequest, count + 1);

    // Retry the request
    return fetch(clonedRequest);
  };
}

// endregion
