import type { TokenPayload } from "../types.js";
import type {
  DeviceAuthorizationClientConfig,
  DeviceAuthorizationResponse,
  PollOptions,
} from "./types.js";
import { OAuthClientBase } from "./base.js";
import { getDeviceAuthorizationEndpoint, getTokenEndpoint } from "./discovery.js";
import { AbortError, OAuthClientError, PollingTimeoutError } from "./errors.js";

/**
 * Default polling interval (seconds) per RFC 8628
 */
const DEFAULT_INTERVAL = 5;

/**
 * Default polling timeout (seconds)
 */
const DEFAULT_TIMEOUT = 300;

/**
 * OAuth 2.0 Device Authorization client
 *
 * Implements the Device Authorization Grant as defined in RFC 8628.
 * This flow is designed for devices with limited input capabilities
 * (TVs, game consoles, CLI tools) or devices without a browser.
 *
 * The flow works as follows:
 * 1. Client requests device and user codes from the authorization server
 * 2. User navigates to the verification URI on another device and enters the user code
 * 3. Client polls the token endpoint until the user completes authorization
 *
 * @example
 * ```typescript
 * const client = new DeviceAuthorizationClient({
 *   issuer: "https://auth.example.com",
 *   clientId: "cli-app",
 * });
 *
 * // Request device authorization
 * const { userCode, verificationUri, deviceCode, interval } =
 *   await client.requestDeviceAuthorization();
 *
 * // Display to user
 * console.log(`Go to ${verificationUri} and enter code: ${userCode}`);
 *
 * // Poll for token
 * const tokens = await client.pollForToken(deviceCode, interval, {
 *   onPoll: (attempt) => console.log(`Polling attempt ${attempt}...`),
 * });
 * ```
 *
 * @see RFC 8628
 */
export class DeviceAuthorizationClient extends OAuthClientBase {
  readonly #onPending: (() => void) | undefined;
  readonly #onSlowDown: ((newInterval: number) => void) | undefined;
  readonly #pollingTimeout: number;

  constructor(config: DeviceAuthorizationClientConfig) {
    super(config);

    this.#onPending = config.onPending;
    this.#onSlowDown = config.onSlowDown;
    this.#pollingTimeout = config.pollingTimeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Start device authorization flow
   *
   * Requests a device code and user code from the authorization server.
   * The user code should be displayed to the user along with the verification URI.
   *
   * @param scopes Optional scopes to request
   * @returns The device authorization response
   * @see RFC 8628, Section 3.1-3.2
   */
  async requestDeviceAuthorization(scopes?: string[]): Promise<DeviceAuthorizationResponse> {
    const metadata = await this.getServerMetadata();
    const deviceEndpoint = getDeviceAuthorizationEndpoint(metadata, this.issuer);

    const params: Record<string, string> = { client_id: this.clientId };

    // Add client secret if configured (for confidential clients)
    if (this.clientSecret) {
      params.client_secret = this.clientSecret;
    }

    // Add scopes
    const requestedScopes = scopes ?? this.defaultScopes;
    if (requestedScopes.length > 0) {
      params.scope = requestedScopes.join(" ");
    }

    const response = await this.request<DeviceCodeResponse>(deviceEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(params).toString(),
    });

    return {
      deviceCode: response.device_code,
      userCode: response.user_code,
      verificationUri: response.verification_uri,
      verificationUriComplete: response.verification_uri_complete,
      expiresIn: response.expires_in,
      interval: response.interval ?? DEFAULT_INTERVAL,
    };
  }

  /**
   * Poll for token with automatic interval handling
   *
   * Polls the token endpoint at the specified interval until:
   * - The user completes authorization (returns token)
   * - The device code expires (throws error)
   * - The polling times out (throws error)
   * - The operation is aborted via AbortSignal (throws error)
   *
   * Automatically handles `slow_down` responses by increasing the interval.
   *
   * @param deviceCode The device code from requestDeviceAuthorization
   * @param interval The polling interval in seconds (from requestDeviceAuthorization)
   * @param options Polling options
   * @returns The token response
   * @throws {PollingTimeoutError} If polling times out
   * @throws {AbortError} If aborted via signal
   * @throws {OAuthClientError} If the device code expires or is denied
   * @see RFC 8628, Section 3.4-3.5
   */
  async pollForToken(
    deviceCode: string,
    interval: number = DEFAULT_INTERVAL,
    options: PollOptions = {},
  ): Promise<TokenPayload> {
    const { signal, onPoll } = options;
    const startTime = Date.now();
    const timeoutMs = this.#pollingTimeout * 1000;

    let currentInterval = interval;
    let attempt = 0;

    while (true) {
      // Check for abort
      if (signal?.aborted) {
        throw new AbortError({ cause: signal.reason });
      }

      // Check for timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new PollingTimeoutError(this.#pollingTimeout);
      }

      // Wait for interval before polling
      await this.#sleep(currentInterval * 1000, signal);

      attempt++;
      onPoll?.(attempt);

      try {
        const response = await this.#requestToken(deviceCode);

        // Success - store and return tokens
        await this.storeTokens(response);
        return response;
      } catch (error) {
        if (!(error instanceof OAuthClientError)) {
          throw error;
        }

        switch (error.code) {
          case "authorization_pending":
            // User hasn't completed authorization yet, continue polling
            this.#onPending?.();
            continue;

          case "slow_down":
            // Increase interval by 5 seconds per RFC 8628
            currentInterval += 5;
            this.#onSlowDown?.(currentInterval);
            continue;

          case "expired_token":
            // Device code expired
            throw error;

          case "access_denied":
            // User denied the request
            throw error;

          default:
            // Other error, rethrow
            throw error;
        }
      }
    }
  }

  /**
   * Convenience method: start flow and poll in one call
   *
   * Combines requestDeviceAuthorization and pollForToken for simpler usage.
   *
   * @param scopes Optional scopes to request
   * @param options Options including callbacks and polling settings
   * @returns The token response
   *
   * @example
   * ```typescript
   * const tokens = await client.authorize(["openid", "profile"], {
   *   onUserCode: ({ userCode, verificationUri }) => {
   *     console.log(`Go to ${verificationUri} and enter: ${userCode}`);
   *   },
   *   onPoll: (attempt) => console.log(`Attempt ${attempt}`),
   * });
   * ```
   */
  async authorize(
    scopes?: string[],
    options: PollOptions & {
      /**
       * Callback when device authorization is ready
       */
      onUserCode?: (response: DeviceAuthorizationResponse) => void;
    } = {},
  ): Promise<TokenPayload> {
    const deviceAuth = await this.requestDeviceAuthorization(scopes);

    options.onUserCode?.(deviceAuth);

    return this.pollForToken(deviceAuth.deviceCode, deviceAuth.interval, {
      signal: options.signal,
      onPoll: options.onPoll,
    });
  }

  /**
   * Request token from the token endpoint
   */
  async #requestToken(deviceCode: string): Promise<TokenPayload> {
    const metadata = await this.getServerMetadata();
    const tokenEndpoint = getTokenEndpoint(metadata, this.issuer);

    const params: Record<string, string> = {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: deviceCode,
      client_id: this.clientId,
    };

    if (this.clientSecret) {
      params.client_secret = this.clientSecret;
    }

    return await this.tokenRequest(tokenEndpoint, params);
  }

  /**
   * Sleep for a specified duration, respecting abort signal
   */
  async #sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);

      if (signal) {
        const abortHandler = () => {
          clearTimeout(timeout);
          reject(new AbortError({ cause: signal.reason }));
        };

        if (signal.aborted) {
          clearTimeout(timeout);
          reject(new AbortError({ cause: signal.reason }));
          return;
        }

        signal.addEventListener("abort", abortHandler, { once: true });

        // Clean up abort listener when timeout completes
        const originalResolve = resolve;
        setTimeout(() => {
          signal.removeEventListener("abort", abortHandler);
          originalResolve();
        }, ms);
      }
    });
  }
}

/**
 * Device code response from the server
 */
interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
}
