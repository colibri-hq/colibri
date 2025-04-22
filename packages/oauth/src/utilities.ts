import type { AuthorizationServerOptions, Entities } from "./types";
import { OAuthError } from "./errors";

// region Response Generation

/**
 * Generate a redirect response.
 *
 * This function generates a redirect response with a specified status code and location. It also
 * accepts optional search parameters to include in the redirect URL as a convenience shortcut to
 * avoid manually constructing the URL.
 *
 * @param uri The URI to redirect to.
 * @param searchParams Any search parameters to include in the redirect URL.
 * @param status The HTTP status code for the redirect. Defaults to `302` (Found).
 */
export function redirectResponse(
  uri: string | URL,
  searchParams?: URLSearchParams | Record<string, string | undefined | null>,
  status = 302,
) {
  const url = new URL(uri);

  if (searchParams instanceof URLSearchParams) {
    searchParams.forEach((key, value) => {
      url.searchParams.append(key, value);
    });
  } else if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) {
        url.searchParams.append(key, value);
      }
    }
  }

  // Including a body in a redirect response is not mandatory, but good practice to provide a
  // fallback for clients that do not support redirects, or render the intermediate page to the user
  const body = `<!doctype html><html lang="en">
      <head><title>Redirecting...</title></head>
      <body>
        <p>Redirecting to <a href="${url}">${url}</a></p>
      </body>
    </html>`;

  return new Response(body, {
    status,
    headers: {
      ...standardHeaders(),
      "content-type": "text/html",
      refresh: `0; url=${url}`,
      location: url.toString(),
    },
  });
}

/**
 * Generate a JSON response.
 *
 * This function generates a JSON response with a specified payload and optional response
 * initialization options.
 *
 * @param payload The payload to include in the JSON response.
 * @param init Optional response initialization options. Passed to the Response constructor verbatim
 */
export function jsonResponse(payload: any, init?: ResponseInit) {
  // Indenting the JSON response isn't very common, but it makes it easier to read the response body
  // when debugging an already annoying issue, so let's grant this curtesy to the developer dealing
  // with our library here, at the cost of a few bytes in the response body.
  const body = JSON.stringify(payload, null, 2);

  return new Response(body, {
    ...init,
    status: 200,
    headers: {
      ...standardHeaders(),
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

/**
 * Resolve the standard headers for a response from the OAuth server.
 *
 * These headers are used to prevent caching of the response and ensure that the client, or any
 * intermediate caches, do not store the response.
 * They have been derived from the OAuth 2.0 specification (e.g.
 * [Section 5.1 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-5.1)).
 */
function standardHeaders() {
  return {
    "cache-control": "no-store",
    pragma: "no-cache",
  };
}

// endregion

/**
 * Calculate the offset in seconds between two dates.
 *
 * @param date Date to resolve the offset for
 * @param reference Date to use as a reference point. If omitted, the current date is used.
 *
 * @returns The offset in seconds between the two dates.
 */
export function timeOffset(date: Date, reference = new Date()) {
  return Math.floor((date.getTime() - reference.getTime()) / 1_000);
}

/**
 * Parse the request body as `application/x-www-form-urlencoded`.
 *
 * @param request The request to parse the body from.
 *
 * @returns The parsed request body as an object.
 * @throws OAuthError if the request content type is not `application/x-www-form-urlencoded`.
 */
export async function parseRequestBody<
  T extends Record<string, FormDataEntryValue> = Record<
    string,
    FormDataEntryValue
  >,
>(request: Request) {
  try {
    const body = await request.formData();

    return Object.fromEntries(body.entries()) as T;
  } catch (error) {
    throw new OAuthError(
      "invalid_request",
      "The request content type must be 'application/x-www-form-urlencoded'",
      undefined,
      { cause: error },
    );
  }
}

/**
 * Resolve the client by the client ID.
 *
 * This function loads the client from the persistence adapter, applies validation checks, and
 * returns the resolved client instance.
 *
 * @param clientId The client ID to resolve.
 * @param loadClient The function to load the client from the persistence adapter.
 *
 * @returns The resolved client.
 * @throws OAuthError if the client ID is missing or invalid.
 */
export async function resolveClient<
  C extends Entities.Client,
  T extends AuthorizationServerOptions<C>,
>(clientId: string, { loadClient }: Pick<T, "loadClient">) {
  let client: C | undefined;

  try {
    client = await loadClient(clientId);
  } catch {
    throw new OAuthError(
      "invalid_request",
      "The client ID is missing or invalid",
    );
  }

  if (!client) {
    throw new OAuthError(
      "invalid_client",
      "The client ID is missing or invalid",
    );
  }

  if (!client.active) {
    throw new OAuthError(
      "invalid_client",
      "The client is currently inactive and cannot be used",
    );
  }

  if (client.revoked) {
    throw new OAuthError(
      "invalid_client",
      "The client has been revoked and can no longer be used",
    );
  }

  return client;
}

/**
 * Resolve available scopes for a client.
 *
 * This function checks if the requested scopes are valid and known to the server.
 *
 * @param clientScopes The scopes that the client has access to.
 * @param scopes The requested scopes.
 * @param loadScopes The function to load the known scopes from the persistence adapter.
 *
 * @returns The resolved scopes.
 * @throws OAuthError if the requested scopes are invalid or unknown.
 */
export async function resolveScopes<
  C extends Entities.Client,
  T extends AuthorizationServerOptions<C>,
>(
  { scopes: clientScopes }: Pick<C, "scopes">,
  scopes: string[],
  { loadScopes }: Pick<T, "loadScopes">,
) {
  let knownScopes: Set<string>;

  try {
    knownScopes = new Set(await loadScopes());
  } catch {
    throw new OAuthError("server_error");
  }

  const unknown = Array.from(new Set(scopes).difference(knownScopes));

  if (unknown.length > 0) {
    throw new OAuthError(
      "invalid_scope",
      unknown.length === 1
        ? `The scope is invalid: Check the "${unknown.at(0)}" scope`
        : `Some scopes are invalid: Check the "${unknown.join('", "')}" scopes`,
    );
  }

  return scopes.filter((scope) => clientScopes.includes(scope));
}
