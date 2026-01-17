import type { MaybePromise } from "@colibri-hq/shared";
import { type Cookies, redirect } from "@sveltejs/kit";

export function resolvePreviousLocation(cookies: Cookies, url: URL, fallback: string | URL = "/") {
  const previous = cookies.get("_previous") ?? url.searchParams.get("previous") ?? fallback;
  cookies.delete("_previous", { path: "/auth" });
  url.searchParams.delete("previous");

  return new URL(
    // Remove the origin from the previous URL to prevent redirecting to a different domain
    previous instanceof URL ? previous.toString().replace(previous.origin, "") : previous,
    url,
  );
}

export function redirectToPreviousLocation(
  cookies: Cookies,
  url: URL,
  fallback: string | URL = "/",
  status = 302,
): never {
  const destination = resolvePreviousLocation(cookies, url, fallback);

  throw redirect(status, destination);
}

export function storePreviousLocation(cookies: Cookies, url: URL) {
  const destination = url.toString().replace(url.origin, "");

  url.searchParams.set("previous", destination);

  cookies.set("_previous", destination, { path: "/auth", sameSite: "lax", httpOnly: true });
}

export async function ensureLoggedIn(
  cookies: Cookies,
  url: URL,
  authData: MaybePromise<{ isAuthenticated: boolean }>,
) {
  const { isAuthenticated } = await authData;

  if (!isAuthenticated) {
    storePreviousLocation(cookies, url);
    const loginUrl = new URL(url);
    loginUrl.pathname = "/auth/login";

    throw redirect(303, loginUrl);
  }
}
