import type { OAuthClientBase } from "../base.js";
import type { Fetch } from "../types.js";
import { TokenExpiredError } from "../errors.js";
import {
  InterceptorManager,
  type RequestInterceptor,
  type ResponseInterceptor,
} from "./interceptors.js";

export * from "./interceptors.js";

/**
 * Configuration for AuthenticatedFetch
 */
export interface AuthenticatedFetchConfig {
  /**
   * OAuth client to use for tokens
   */
  client: OAuthClientBase;

  /**
   * Base fetch function to use
   *
   * @default globalThis.fetch
   */
  fetch?: Fetch | undefined;

  /**
   * Automatically retry on 401 after refreshing token
   *
   * @default true
   */
  autoRetry?: boolean | undefined;

  /**
   * Maximum number of retry attempts on 401
   *
   * @default 1
   */
  maxRetries?: number | undefined;

  /**
   * Callback when authentication fails (no valid token available)
   */
  onAuthenticationRequired?: (() => void | Promise<void>) | undefined;
}

/**
 * Authenticated fetch wrapper
 *
 * Wraps the fetch API to automatically:
 * - Inject the OAuth access token as a Bearer token
 * - Retry requests on 401 after refreshing the token
 * - Support request and response interceptors
 *
 * @example
 * ```ts
 * const authFetch = new AuthenticatedFetch({
 *   client: oauthClient,
 * });
 *
 * // Make authenticated requests
 * const response = await authFetch.fetch("https://api.example.com/data");
 *
 * // Add interceptors
 * authFetch.addRequestInterceptor((request) => {
 *   console.log(`Request: ${request.url}`);
 *   return request;
 * });
 * ```
 */
export class AuthenticatedFetch {
  readonly #client: OAuthClientBase;
  readonly #baseFetch: Fetch;
  readonly #autoRetry: boolean;
  readonly #maxRetries: number;
  readonly #onAuthenticationRequired: (() => void | Promise<void>) | undefined;
  readonly #interceptors: InterceptorManager;

  constructor(config: AuthenticatedFetchConfig) {
    this.#client = config.client;
    this.#baseFetch = config.fetch ?? globalThis.fetch.bind(globalThis);
    this.#autoRetry = config.autoRetry ?? true;
    this.#maxRetries = config.maxRetries ?? 1;
    this.#onAuthenticationRequired = config.onAuthenticationRequired;
    this.#interceptors = new InterceptorManager();
  }

  /**
   * Make an authenticated fetch request
   *
   * The access token is automatically added to the Authorization header.
   * If the response is 401 and autoRetry is enabled, the token is refreshed
   * and the request is retried.
   *
   * @param input Request URL or Request object
   * @param init Request options
   * @returns The fetch response
   */
  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return this.#fetchWithRetry(input, init, 0);
  }

  /**
   * Add a request interceptor
   *
   * Request interceptors are called before each request is made.
   * They can modify the request or throw to cancel it.
   *
   * @param interceptor The interceptor function
   * @returns A function to remove the interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    return this.#interceptors.addRequestInterceptor(interceptor);
  }

  /**
   * Add a response interceptor
   *
   * Response interceptors are called after each response is received.
   * They can modify the response or throw to trigger error handling.
   *
   * @param interceptor The interceptor function
   * @returns A function to remove the interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    return this.#interceptors.addResponseInterceptor(interceptor);
  }

  /**
   * Internal fetch with retry logic
   */
  async #fetchWithRetry(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    attempt: number,
  ): Promise<Response> {
    const token = await this.#client.getAccessToken();

    if (!token) {
      await this.#onAuthenticationRequired?.();

      throw new TokenExpiredError("No access token available");
    }

    let request = new Request(input, init);
    request = await this.#interceptors.runRequestInterceptors(
      new Request(request, {
        headers: new Headers({
          ...Object.fromEntries(request.headers.entries()),
          Authorization: `Bearer ${token}`,
        }),
      }),
    );

    const response = await this.#interceptors.runResponseInterceptors(
      await this.#baseFetch(request),
      request,
    );

    // Handle 401 with auto-retry
    if (response.status === 401 && this.#autoRetry && attempt < this.#maxRetries) {
      try {
        await this.#client.refreshAccessToken();

        return this.#fetchWithRetry(input, init, attempt + 1);
      } catch (refreshError) {
        await this.#onAuthenticationRequired?.();

        throw refreshError;
      }
    }

    return response;
  }
}

/**
 * Create an authenticated fetch function
 *
 * Returns a fetch function that automatically injects OAuth tokens.
 * This is a simpler alternative to using the AuthenticatedFetch class
 * when you don't need interceptors.
 *
 * @param client OAuth client to use for tokens
 * @param config Optional configuration
 * @returns A fetch function with the same signature as globalThis.fetch
 *
 * @example
 * ```ts
 * const authFetch = createAuthenticatedFetch(oauthClient);
 *
 * const response = await authFetch("https://api.example.com/data", {
 *   method: "POST",
 *   body: JSON.stringify({ key: "value" }),
 * });
 * ```
 */
export function createAuthenticatedFetch(
  client: OAuthClientBase,
  config?: Omit<AuthenticatedFetchConfig, "client">,
): Fetch {
  const authFetch = new AuthenticatedFetch({ ...config, client });
  return (input, init) => authFetch.fetch(input, init);
}
