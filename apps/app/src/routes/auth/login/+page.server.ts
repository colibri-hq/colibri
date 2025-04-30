import { env } from "$env/dynamic/public";
import {
  dispatchPasscode,
  issueUserToken,
  setJwtCookie,
} from "$lib/server/auth";
import {
  redirectToPreviousLocation,
  resolvePreviousLocation,
  storePreviousLocation,
} from "$lib/server/utilities";
import {
  createPasscode,
  findUserByEmail,
  findUserByIdentifier,
  hasRegisteredAuthenticator,
  NoResultError,
  type User,
  verifyPasscode,
} from "@colibri-hq/sdk";
import { error, fail, redirect } from "@sveltejs/kit";
import { z, type ZodIssue } from "zod";
import type { Actions } from "./$types";

export const actions = {
  /**
   * Request a passcode for the given email address.
   *
   * This action is used to request a passcode for a given email address. The passcode is then used
   * to verify the user's identity.
   */
  async request({ request, url, platform, locals: { database } }) {
    // region Validation
    const body = await request.formData();
    const payload = z
      .object({
        email: z
          .string()
          .email({
            message:
              "The email address seems to be invalid. Please check it and try again.",
          })
          .toLowerCase(),
      })
      .safeParse(Object.fromEntries(body.entries()));

    if (!payload.success) {
      return fail(400, {
        issues: payload.error.errors,
      });
    }

    let user: User;

    try {
      user = await findUserByEmail(database, payload.data.email);
    } catch (cause) {
      if (!(cause instanceof Error)) {
        throw cause;
      }

      if (cause instanceof NoResultError) {
        throw redirect(302, new URL("login/unknown", url));
      }

      return fail(400, {
        message: cause.message,
        issues: [
          {
            code: "custom",
            path: ["email"],
            message:
              "The email address is unknown. Please check it and try again.",
          } satisfies ZodIssue,
        ],
      });
    }
    // endregion

    // region Dispatch Passcode
    try {
      const { code } = await createPasscode(database, user);
      await dispatchPasscode(platform, user, code);
    } catch (err) {
      if (!(err instanceof Error)) {
        throw err;
      }

      return error(500, {
        message: `Failed to dispatch passcode: ${err.message}`,
      });
    }
    // endregion

    return {
      sent: true,
      email: payload.data.email,
    };
  },

  /**
   * Verify the passcode for the given email address.
   *
   * This action is used to verify the passcode for a given email address. If the passcode is
   * correct, the user is authenticated and a JWT is issued.
   */
  async verify({ request, url, cookies, locals: { database } }) {
    // region Validation
    const body = await request.formData();
    const payload = z
      .object({
        previous: z.string().optional(),
        email: z.string().email().toLowerCase(),
        passcode: z
          .string()
          .length(Number(env.PUBLIC_PASSCODE_LENGTH))
          .regex(/^\d+$/),
      })
      .safeParse(Object.fromEntries(body.entries()));

    if (!payload.success) {
      return fail(400, {
        issues: payload.error.errors,
      });
    }

    const email = payload.data.email;
    const code = payload.data.passcode;
    let user: User;

    try {
      const userId = await verifyPasscode(database, email, code);
      user = await findUserByIdentifier(database, userId);
    } catch (cause) {
      if (!(cause instanceof Error)) {
        throw cause;
      }

      if (cause instanceof NoResultError) {
        return fail(400, {
          error: "Passcode expired or invalid",
          email,
        });
      }

      throw error(401, { message: "Authentication failed" });
    }
    // endregion

    // region Token Issuance
    // Sign the user token: We have authenticated the user successfully using the passcode, so
    // they may use this JWT to create their pass *key*.
    const token = issueUserToken(user);

    // Set the cookie on the response: It will be included in any requests to the server,
    // including for tRPC. This makes for a nice, transparent, and "just works" authentication
    // scheme.
    setJwtCookie(cookies, token);
    // endregion

    // region Redirect
    const hasAuthenticator = await hasRegisteredAuthenticator(database, user);

    if (hasAuthenticator) {
      return redirectToPreviousLocation(
        cookies,
        url,
        payload.data.previous ? new URL(payload.data.previous, url) : "/",
      );
    }

    storePreviousLocation(cookies, resolvePreviousLocation(cookies, url));
    const target = new URL(url);
    target.pathname = "/auth/attestation";

    throw redirect(303, target);
    // endregion
  },
} satisfies Actions;
