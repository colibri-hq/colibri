import type { User } from "@colibri-hq/sdk";
import type { Cookies } from "@sveltejs/kit";
import type { JwtPayload } from "jsonwebtoken";
import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { sendMail } from "$lib/server/mail";
import { generateRandomString } from "@colibri-hq/shared";
import jwt from "jsonwebtoken";

const defaultSessionIdCookieName = "ksid";
const defaultJwtCookieName = "jwt";

interface AccessTokenPayload extends JwtPayload {
  name: string;
  email: string;
}

/**
 * Issue a new access token for the given user.
 *
 * This function issues a new access token for the given user. The token is signed using the JWT
 * secret from the environment and contains the user's name and email address.
 * User tokens are exclusively used for in-browser usage as session tokens. To authenticate API
 * requests, use OAuth 2.0 access tokens instead.
 *
 * @param user
 */
export function issueUserToken(user: Pick<User, "id" | "name" | "email" | "role">) {
  const payload: Partial<AccessTokenPayload> = { name: user.name || user.email, email: user.email };

  return jwt.sign(payload, env.JWT_SECRET, { subject: user.id.toString() });
}

export function verifyToken(token: string) {
  if (!token) {
    throw new Error("Missing or invalid access token");
  }

  const { payload } = jwt.verify(token, env.JWT_SECRET, { complete: true });

  if (typeof payload === "string") {
    throw new Error("Unexpected token payload");
  }

  return payload as AccessTokenPayload;
}

export function resolveAuthSessionId(cookies: Cookies) {
  let sessionId = getAuthSessionIdFromCookie(cookies);

  if (!sessionId) {
    sessionId = generateRandomString(16);

    setAuthSessionIdCookie(cookies, sessionId);
  }

  return sessionId;
}

export function setAuthSessionIdCookie(cookies: Cookies, sessionId: string) {
  const name = env.SESSION_ID_COOKIE_NAME || defaultSessionIdCookieName;

  cookies.set(name, sessionId, {
    path: "/auth",
    maxAge: 60 * 5,
    httpOnly: true,
    sameSite: "strict",
  });
}

export function getAuthSessionIdFromCookie(cookies: Cookies) {
  const name = env.SESSION_ID_COOKIE_NAME || defaultSessionIdCookieName;

  return cookies.get(name);
}

export function setJwtCookie(cookies: Cookies, token: string) {
  const name = env.JWT_COOKIE_NAME || defaultJwtCookieName;

  cookies.set(name, token, { path: "/", secure: !dev, httpOnly: true });
}

export function getJwtCookie(cookies: Cookies) {
  const name = env.JWT_COOKIE_NAME || defaultJwtCookieName;

  return cookies.get(name);
}

export function resolveUserId(cookies: Cookies) {
  try {
    const { sub } = verifyToken(getJwtCookie(cookies) || "");

    return sub;
  } catch {
    return undefined;
  }
}

export async function dispatchPasscode(
  _platform: Readonly<App.Platform> | undefined,
  user: User,
  code: string,
) {
  await sendMail({
    to: user.email,
    subject: "Verify passcode",
    text:
      `Colibri\r\n=====\r\nHi ${user.name}!\r\nYour verification code:\r\n` +
      `${code}\r\n\r\nAccess to your account isn't possible without this ` +
      `code, even if it hasn't been requested by you.\r\n\r\nThis email ` +
      `has been sent to ${user.email}.`,
  });
}
