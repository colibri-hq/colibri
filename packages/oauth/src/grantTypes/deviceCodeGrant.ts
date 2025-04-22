import { OAuthError } from "../errors.js";
import type { AuthorizationServerOptions, Entities } from "../types.js";
import { z } from "zod";
import { defineGrantType, type GrantTypeOptions } from "./grantType";
import {
  jsonResponse,
  parseRequestBody,
  resolveClient,
  timeOffset,
} from "../utilities";
import type { MaybePromise } from "@colibri-hq/shared";

export interface DeviceCodeGrantOptions<
  T extends Entities.DeviceChallenge = Entities.DeviceChallenge,
> extends GrantTypeOptions {
  /**
   * The TTL for device codes in seconds
   */
  ttl?: number;
  devicePollingInterval?: number;

  /**
   * Device authorization endpoint URL
   */
  endpoint?: string | URL;

  pollDeviceChallenge: (clientId: string, code: string) => MaybePromise<T>;
  loadDeviceChallenge: (deviceCode: string) => MaybePromise<T | undefined>;
  storeDeviceChallenge: (clientId: string, scopes: string[]) => MaybePromise<T>;
}

/**
 * Device Authorization Grant
 * ==========================
 * This OAuth 2.0 [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) protocol extension
 * enables OAuth clients to request user authorization from applications on devices that have
 * limited input capabilities or lack a suitable browser. Such devices include smart TVs, media
 * consoles, picture frames, and printers, which lack an easy input method or a suitable browser
 * required for traditional OAuth interactions. The authorization flow defined by this
 * specification, sometimes referred to as the _"device flow"_, instructs the user to review the
 * authorization request on a secondary device, such as a smartphone, which does have the requisite
 * input and browser capabilities to complete the user interaction.
 *
 * The device authorization grant is not intended to replace browser-based OAuth in native apps on
 * capable devices like smartphones. Those apps should follow the practices specified in
 * "OAuth 2.0 for Native Apps" ([RFC 8252](https://datatracker.ietf.org/doc/html/rfc8252)).
 *
 * The operating requirements for using this authorization grant type are:
 *
 *  1. The device is already connected to the Internet.
 *  2. The device is able to make outbound HTTPS requests.
 *  3. The device is able to display or otherwise communicate a URI and code sequence to the user.
 *  4. The user has a secondary device (e.g., personal computer or smartphone) from which they can
 *     process the request.
 *
 * As the device authorization grant does not require two-way communication between the OAuth client
 * on the device and the user agent (unlike other OAuth 2 grant types, such as the authorization
 * code and implicit grant types), it supports several use cases that cannot be served by those
 * other approaches.
 *
 * Instead of interacting directly with the end user's user agent (i.e., browser), the device client
 * instructs the end user to use another computer or device and connect to the authorization server
 * to approve the access request. Since the protocol supports clients that can't receive incoming
 * requests, clients poll the authorization server repeatedly until the end user completes the
 * approval process.
 *
 * The device client typically chooses the set of authorization servers to support (i.e., its own
 * authorization server or those of providers with which it has relationships). It is common for the
 * device client to support only one authorization server, such as in the case of a TV application
 * for a specific media provider that supports only that media provider's authorization server.
 * The user may not yet have an established relationship with that authorization provider, though
 * one can potentially be set up during the authorization flow.
 *
 * ```
 *       +----------+                                +----------------+
 *       |          |>---(A)-- Client Identifier --->|                |
 *       |          |                                |                |
 *       |          |<---(B)-- Device Code,      ---<|                |
 *       |          |          User Code,            |                |
 *       |  Device  |          & Verification URI    |                |
 *       |  Client  |                                |                |
 *       |          |  [polling]                     |                |
 *       |          |>---(E)-- Device Code       --->|                |
 *       |          |          & Client Identifier   |                |
 *       |          |                                |  Authorization |
 *       |          |<---(F)-- Access Token      ---<|     Server     |
 *       +----------+   (& Optional Refresh Token)   |                |
 *             v                                     |                |
 *             :                                     |                |
 *            (C) User Code & Verification URI       |                |
 *             :                                     |                |
 *             v                                     |                |
 *       +----------+                                |                |
 *       | End User |                                |                |
 *       |    at    |<---(D)-- End user reviews  --->|                |
 *       |  Browser |          authorization request |                |
 *       +----------+                                +----------------+
 * ```
 * _Figure 1: Device Authorization Flow_
 *
 * The device authorization flow illustrated in Figure 1 includes the
 * following steps:
 *
 * (A)  The client requests access from the authorization server and includes its client identifier
 *      in the request.
 *
 * (B)  The authorization server issues a device code and an end-user code and provides the end-user
 *      verification URI.
 *
 * (C)  The client instructs the end user to use a user agent on another device and visit the
 *      provided end-user verification URI. The client provides the user with the end-user code to
 *      enter in order to review the authorization request.
 *
 * (D)  The authorization server authenticates the end user (via the user agent), and prompts the
 *      user to input the user code provided by the device client. The authorization server
 *      validates the user code provided by the user, and prompts the user to accept or decline
 *      the request.
 *
 * (E)  While the end user reviews the client's request (step D), the client repeatedly polls the
 *      authorization server to find out if the user completed the user authorization step.
 *      The client includes the device code and its client identifier.
 *
 * (F)  The authorization server validates the device code provided by the client and responds with
 *      the access token if the client is granted access, an error if they are denied access, or an
 *      indication that the client should continue to poll.
 *
 * User Interaction
 * ----------------
 * After receiving a successful authorization response, the client displays or otherwise
 * communicates the `user_code` and the `verification_uri` to the end user and instructs them to
 * visit the URI in a user agent on a secondary device (for example, in a browser on their mobile
 * phone) and enter the user code.
 *
 * ```
 * +-----------------------------------------------+
 * |                                               |
 * |  Using a browser on another device, visit:    |
 * |  https://example.com/device                   |
 * |                                               |
 * |  And enter the code:                          |
 * |  WDJB-MJHT                                    |
 * |                                               |
 * +-----------------------------------------------+
 * ```
 * _Figure 2: Example User Instruction_
 *
 * The authorizing user navigates to the `verification_uri` and authenticates with the authorization
 * server in a secure TLS-protected ([RFC 8446](https://datatracker.ietf.org/doc/html/rfc8446))
 * session. The authorization server prompts the end user to identify the device authorization
 * session by entering the `user_code` provided by the client. The authorization server should then
 * inform the user about the action they are undertaking and ask them to approve or deny the
 * request. Once the user interaction is complete, the server instructs the user to return to
 * their device.
 *
 * During the user interaction, the device continuously polls the token endpoint with the
 * `device_code`, as detailed in
 * [Section 3.4](https://datatracker.ietf.org/doc/html/rfc8628#section-3.4), until the user
 * completes the interaction, the code expires, or another error occurs. The `device_code` is not
 * intended for the end user directly; thus, it should not be displayed during the interaction to
 * avoid confusing the end user.
 *
 * Authorization servers supporting this specification **MUST** implement a user-interaction
 * sequence that starts with the user navigating to `verification_uri` and continues with them
 * supplying the `user_code` at some stage during the interaction. Other than that, the exact
 * sequence and implementation of the user interaction is up to the authorization server; for
 * example, the authorization server may enable new users to sign up for an account during the
 * authorization flow or add additional security verification steps.
 *
 * It is **NOT RECOMMENDED** for authorization servers to include the user code (`user_code`) in the
 * verification URI (`verification_uri`), as this increases the length and complexity of the URI
 * that the user must type. While the user must still type a similar number of characters with the
 * `user_code` separated, once they successfully navigate to the `verification_uri`, any errors in
 * entering the code can be highlighted by the authorization server to improve the user experience.
 * The next section documents the user interaction with `verification_uri_complete`, which is
 * designed to carry both pieces of information.
 *
 * ### Non-Textual Verification URI Optimization
 * When `verification_uri_complete` is included in the authorization response
 * ([Section 3.2](https://datatracker.ietf.org/doc/html/rfc8628#section-3.4), clients **MAY**
 * present this URI in a non-textual manner using any method that results in the browser being
 * opened with the URI, such as with QR (Quick Response) codes or NFC (Near Field Communication), to
 * save the user from typing the URI.
 *
 * For usability reasons, it is **RECOMMENDED** for clients to still display the textual
 * verification URI (`verification_uri`) for users who are not able to use such a shortcut.
 * Clients **MUST** still display the `user_code`, as the authorization server will require the user
 * to confirm it to disambiguate devices or as remote phishing mitigation (see
 * [Section 5.4](https://datatracker.ietf.org/doc/html/rfc8628#section-5.4)).
 *
 * If the user starts the user interaction by navigating to `verification_uri_complete`, then the
 * user interaction described in
 * [Section 3.3](https://datatracker.ietf.org/doc/html/rfc8628#section-3.3) is still followed, with
 * the optimization that the user does not need to type in the `user_code`. The server **SHOULD**
 * display the `user_code` to the user and ask them to verify that it matches the `user_code` being
 * displayed on the device to confirm they are authorizing the correct device. As before, in
 * addition to taking steps to confirm the identity of the device, the user should also be afforded
 * the choice to approve or deny the authorization request.
 *
 * ```
 * +-------------------------------------------------+
 * |                                                 |
 * |  Scan the QR code or, using     +------------+  |
 * |  a browser on another device,   |[_]..  . [_]|  |
 * |  visit:                         | .  ..   . .|  |
 * |  https://example.com/device     | . .  . ....|  |
 * |                                 |.   . . .   |  |
 * |  And enter the code:            |[_]. ... .  |  |
 * |  WDJB-MJHT                      +------------+  |
 * |                                                 |
 * +-------------------------------------------------+
 * ```
 * _Figure 3: Example User Instruction with QR Code Representation of the Complete Verification URI_
 *
 * Device Access Token Request
 * ---------------------------
 * After displaying instructions to the user, the client creates an access token request and sends
 * it to the token endpoint (as defined by
 * [Section 3.2 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)) with a `grant_type` of
 * `urn:ietf:params:oauth:grant-type:device_code`. This is an extension grant type (as defined by
 * [Section 4.5 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-4.5)) created by
 * this specification, with the following parameters:
 *
 *  - **`grant_type`:**
 *    **REQUIRED.** Value **MUST** be set to `urn:ietf:params:oauth:grant-type:device_code`.
 *
 *  - **`device_code`:**
 *    **REQUIRED. The device verification code, `device_code` from the device authorization
 *    response, defined in [Section 3.2](https://datatracker.ietf.org/doc/html/rfc8628#section-3.2).
 *
 *  - **`client_id`:**
 *    **REQUIRED if the client is not authenticating with the authorization server as described in
 *    [Section 3.2.1 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-3.2.1).
 *    The client identifier as described in
 *    [Section 2.2 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-2.2).
 *
 * For example, the client makes the following HTTPS request (line breaks are for display
 * purposes only):
 *
 * ```http
 * POST /token HTTP/1.1
 * Host: server.example.com
 * Content-Type: application/x-www-form-urlencoded
 *
 *  grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code
 * &device_code=GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS
 * &client_id=1406020730
 * ```
 *
 * If the client was issued client credentials (or assigned other authentication requirements), the
 * client **MUST** authenticate with the authorization server as described in
 * [Section 3.2.1 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-3.2.1).
 * Note that there are security implications of statically distributed client credentials; see
 * [Section 5.6](https://datatracker.ietf.org/doc/html/rfc8628#section-5.6).
 *
 * The response to this request is defined in
 * [Section 3.5](https://datatracker.ietf.org/doc/html/rfc8628#section-3.5). Unlike other OAuth
 * grant types, it is expected for the client to try the access token request repeatedly in a
 * polling fashion based on the error code in the response.
 *
 * Device Access Token Response
 * ----------------------------
 * If the user has approved the grant, the token endpoint responds with a success response defined
 * in [Section 5.1 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-5.1);
 * otherwise, it responds with an error, as defined in
 * [Section 5.2 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2).
 *
 * In addition to the error codes defined in
 * [Section 5.2 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2), the
 * following error codes are specified for use with the device authorization grant in token
 * endpoint responses:
 *
 *  - **`authorization_pending`:**
 *    The authorization request is still pending as the end user hasn't yet completed the
 *    user-interaction steps
 *    ([Section 3.3](https://datatracker.ietf.org/doc/html/rfc8628#section-3.3). The client
 *    **SHOULD** repeat the access token request to the token endpoint (a process known as polling).
 *    Before each new request, the client **MUST** wait at least the number of seconds specified by
 *    the `interval` parameter of the device authorization response (see
 *    [Section 3.2](https://datatracker.ietf.org/doc/html/rfc8628#section-3.2)), or 5 seconds if
 *    none was provided, and respect any increase in the polling interval required by the
 *    `slow_down` error.
 *
 *  - **`slow_down`:**
 *    A variant of `authorization_pending`, the authorization request is still pending and polling
 *    should continue, but the interval **MUST** be increased by 5 seconds for this and all
 *    subsequent requests.
 *
 *  - **`access_denied`:**
 *    The authorization request was denied.
 *
 *  - **`expired_token`:**
 *    The `device_code` has expired, and the device authorization session has concluded. The client
 *    **MAY** commence a new device authorization request but **SHOULD** wait for user interaction
 *    before restarting to avoid unnecessary polling.
 *
 * The `authorization_pending` and `slow_down` error codes define particularly unique behavior, as
 * they indicate that the OAuth client should continue to poll the token endpoint by repeating the
 * token request (implementing the precise behavior defined above). If the client receives an error
 * response with any other error code, it **MUST** stop polling and **SHOULD** react accordingly,
 * for example, by displaying an error to the user.
 *
 * On encountering a connection timeout, clients **MUST** unilaterally reduce their polling
 * frequency before retrying. The use of an exponential backoff algorithm to achieve this, such as
 * doubling the polling interval on each such connection timeout, is **RECOMMENDED**.
 *
 * The assumption of this specification is that the separate device on which the user is authorizing
 * the request does not have a way to communicate back to the device with the OAuth client.
 * This protocol only requires a one-way channel in order to maximize the viability of the protocol
 * in restricted environments, like an application running on a TV that is only capable of outbound
 * requests. If a return channel were to exist for the chosen user-interaction interface, then the
 * device **MAY** wait until notified on that channel that the user has completed the action before
 * initiating the token request (as an alternative to polling). Such behavior is, however, outside
 * the scope of this specification.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8628
 */
export const DeviceCodeGrant = defineGrantType({
  type: "urn:ietf:params:oauth:grant-type:device_code",

  schema: z.object({
    grant_type: z.literal("urn:ietf:params:oauth:grant-type:device_code", {
      message: "The grant type is invalid",
      description:
        'REQUIRED. Value **MUST** be set to "urn:ietf:params:oauth:grant-type:device_code".',
    }),
    device_code: z.string({
      required_error: "The device code is missing",
      invalid_type_error: "The device code is invalid",
      description:
        'REQUIRED. The device verification code, "device_code" ' +
        "from the device authorization response, defined in Section 3.2 of RFC 8628.",
    }),
    client_id: z.string({
      required_error: "The client ID is missing",
      invalid_type_error: "The client ID is invalid",
      description:
        "REQUIRED if the client is not authenticating with the" +
        "authorization server as described in Section 3.2.1 of RFC 6749." +
        "The client identifier as described in Section 2.2 of RFC 6749.",
    }),
  }),

  configure(options: DeviceCodeGrantOptions) {
    return options;
  },

  validate(params) {
    return params;
  },

  async handle({ device_code: code }, client) {
    let deviceChallenge: Entities.DeviceChallenge;

    // Try to retrieve the device challenge; if found, the last poll timestamp will be updated in
    // the same query, and the updated challenge will be returned.
    try {
      deviceChallenge = await this.options.pollDeviceChallenge(client.id, code);
    } catch {
      throw new OAuthError("invalid_grant", "The challenge code is invalid");
    }

    // region Handle the token response according to RFC8628, Section 3.5:
    if (deviceChallenge.expires_at <= new Date()) {
      throw new OAuthError("expired_token");
    }

    // TODO: This could benefit from a cool-down sliding window?
    if (
      isPollingTooFast(deviceChallenge, this.options.devicePollingInterval ?? 5)
    ) {
      throw new OAuthError("slow_down");
    }

    if (deviceChallenge.approved === null) {
      throw new OAuthError("authorization_pending");
    }

    if (!deviceChallenge.approved) {
      throw new OAuthError(
        "access_denied",
        "The resource owner denied the request",
      );
    }

    const scopes = (deviceChallenge.scopes ?? client.scopes)?.filter(
      (scope): scope is string => scope !== null,
    );

    return {
      accessToken: {
        ttl: this.options.accessTokenTtl,
      },
      refreshToken: {
        ttl: this.options.refreshTokenTtl,
      },
      scopes,
    };
  },
});

function isPollingTooFast(
  { last_poll_at }: Entities.DeviceChallenge,
  interval: number,
) {
  if (last_poll_at === null) {
    return false;
  }

  return (new Date().getTime() - last_poll_at.getTime()) / 1_000 < interval;
}

// noinspection SpellCheckingInspection
/**
 * Device Authorization Endpoint
 * =============================
 * This specification defines a new OAuth endpoint: the device authorization endpoint. This is
 * separate from the OAuth authorization endpoint defined in
 * [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) with which the user interacts via a
 * user agent (i.e., a browser). By comparison, when using the device authorization endpoint, the
 * OAuth client on the device interacts with the authorization server directly without presenting
 * the request in a user agent, and the end user authorizes the request on a separate device. This
 * interaction is defined as follows.
 *
 * Device Authorization Request
 * ----------------------------
 * The client initiates the authorization flow by requesting a set of verification codes from the
 * authorization server by making an HTTP `POST` request to the device authorization endpoint.
 * The client makes a device authorization request to the device authorization endpoint by including
 * the following parameters using the `application/x-www-form-urlencoded` format, per
 * [Appendix B of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#appendix-B), with a
 * character encoding of UTF-8 in the HTTP request entity-body:
 *
 *  - **`client_id`:**
 *    **REQUIRED** if the client is not authenticating with the authorization server as described
 *    in [Section 3.2.1 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-3.2.1).
 *    The client identifier as described in
 *    [Section 2.2 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-2.2).
 *
 *  - **`scope`:**
 *    **OPTIONAL.** The scope of the access request as defined by
 *    [Section 3.3 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-3.3).
 *
 * For example, the client makes the following HTTPS request:
 *
 * ```http
 * POST /device_authorization HTTP/1.1
 * Host: server.example.com
 * Content-Type: application/x-www-form-urlencoded
 *
 * client_id=1406020730&scope=example_scope
 * ```
 *
 * All requests from the device **MUST**  use the Transport Layer Security (TLS) protocol
 * ([RFC 8446](https://datatracker.ietf.org/doc/html/rfc8446)) and implement the best practices of
 * BCP 195 ([RFC 7525](https://datatracker.ietf.org/doc/html/bcp195)).
 *
 * Parameters sent without a value **MUST** be treated as if they were omitted from the request.
 * The authorization server **MUST** ignore unrecognized request parameters. Request and response
 * parameters **MUST NOT** be included more than once.
 *
 * The client authentication requirements of
 * [Section 3.2.1 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-3.2.1) apply
 * to requests on this endpoint, which means that confidential clients (those that have established
 * client credentials) authenticate in the same manner as when making requests to the token
 * endpoint, and public clients provide the `client_id` parameter to identify themselves.
 *
 * Due to the polling nature of this protocol (as specified in
 * [Section 3.4](https://datatracker.ietf.org/doc/html/rfc8628#section-3.4)), care is needed to
 * avoid overloading the capacity of the token endpoint. To avoid unneeded requests on the token
 * endpoint, the client **SHOULD** only commence a device authorization request when prompted by
 * the user and not automatically, such as when the app starts or when the previous authorization
 * session expires or fails.
 *
 * Device Authorization Response
 * -----------------------------
 * In response, the authorization server generates a unique device verification code and an end-user
 * code that are valid for a limited time and includes them in the HTTP response body using the
 * `application/json` format ([RFC 8259](https://datatracker.ietf.org/doc/html/rfc8259)) with a 200
 * (OK) status code. The response contains the following parameters:
 *
 * - **`device_code`:**
 *   **REQUIRED.** The device verification code.
 *
 * - **`user_code`:**
 *   **REQUIRED.** The end-user verification code.
 *
 * - **`verification_uri`:**
 *   **REQUIRED.** The end-user verification URI on the authorization server. The URI should be
 *   short and easy to remember as end users will be asked to manually type it into their
 *   user agent.
 *
 * - **`verification_uri_complete`:**
 *   **OPTIONAL.** A verification URI that includes the `user_code` (or other information with the
 *   same function as the `user_code`), which is designed for non-textual transmission.
 *
 * - **`expires_in`:**
 *   **REQUIRED.** The lifetime in seconds of the `device_code` and `user_code`.
 *
 * - **`interval`:**
 *   **OPTIONAL.** The minimum amount of time in seconds that the client **SHOULD** wait between
 *   polling requests to the token endpoint. If no value is provided, clients **MUST** use `5` as
 *   the default.
 *
 * For example:
 *
 * ```http
 * HTTP/1.1 200 OK
 * Content-Type: application/json
 * Cache-Control: no-store
 *
 * {
 *   "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",
 *   "user_code": "WDJB-MJHT",
 *   "verification_uri": "https://example.com/device",
 *   "verification_uri_complete":
 *       "https://example.com/device?user_code=WDJB-MJHT",
 *   "expires_in": 1800,
 *   "interval": 5
 * }
 * ```
 *
 * In the event of an error (such as an invalidly configured client), the authorization server
 * responds in the same way as the token endpoint specified in
 * [Section 5.2 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2).
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8628#section-3 RFC 8628, Section 3
 */
export async function handleDeviceAuthorizationRequest<
  T extends AuthorizationServerOptions,
>(
  request: Request,
  {
    grantOptions: { devicePollingInterval, storeDeviceChallenge },
    options,
  }: {
    options: T;
    grantOptions: DeviceCodeGrantOptions;
  },
) {
  const body = await parseRequestBody(request);
  const payload = await z
    .object({
      client_id: z.string({
        invalid_type_error: "Client ID is invalid",
        required_error: "Client ID is missing",
      }),
      scope: z
        .string({ message: "The scope is invalid" })
        .optional()
        .transform((scope) => scope?.split(" ") ?? [])
        .pipe(
          options.scopeSchema ??
            z.string({ message: "The scope is invalid" }).array(),
        ),
    })
    .safeParseAsync(body);

  if (!payload.success) {
    // TODO: There must be a better way to do this.
    const message =
      payload.error?.format().client_id?._errors.join(", ") ??
      "Invalid request";

    throw new OAuthError("invalid_request", message);
  }

  const { client_id: clientId, scope: scopes } = payload.data;
  let client;

  try {
    client = await resolveClient(clientId, options);
  } catch {
    throw new OAuthError("invalid_client", "The client ID is invalid");
  }

  if (scopes && !scopes.every((scope) => client.scopes.includes(scope))) {
    throw new OAuthError("invalid_scope", "One or more scopes are invalid");
  }

  let deviceChallenge;

  try {
    deviceChallenge = await storeDeviceChallenge(clientId, scopes ?? []);
  } catch {
    throw new OAuthError(
      "server_error",
      "Device Challenges are currently not available. " +
        "Please retry later or use another way to authorize the device, if possible",
    );
  }

  const userCode = formatUserCode(deviceChallenge.user_code);
  const verificationUri = new URL("/device", request.url);
  const verificationUriComplete = new URL(verificationUri);
  verificationUriComplete.searchParams.set("user_code", userCode);

  return jsonResponse({
    verification_uri: verificationUri,
    verification_uri_complete: verificationUriComplete,
    device_code: deviceChallenge.device_code,
    user_code: userCode,
    interval: devicePollingInterval ?? 5,
    expires_in: timeOffset(deviceChallenge.expires_at),
  });
}

function formatUserCode(code: string) {
  const group = code.length / 2;

  return (code.slice(0, group) + "-" + code.slice(group)).toUpperCase();
}
