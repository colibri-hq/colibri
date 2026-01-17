import { env } from "$env/dynamic/private";
import { getJwtCookie, verifyToken } from "$lib/server/auth";
import { storePreviousLocation } from "$lib/server/utilities";
import {
  type Database,
  findUserByIdentifier,
  grantUserConsent,
  invalidateDeviceChallenge,
  loadClientWithScopes,
  loadDeviceChallengeByUserCode,
  loadUserConsent,
} from "@colibri-hq/sdk";
import { signPayload, verifySignedPayload } from "@colibri-hq/shared";
import { type Cookies, error, fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions } from "./$types";

function authenticate(database: Database, url: URL, cookies: Cookies) {
  try {
    const token = getJwtCookie(cookies) || "";
    const { sub } = verifyToken(token);

    return findUserByIdentifier(database, sub as string);
  } catch {
    storePreviousLocation(cookies, url);
    const target = new URL(url);
    target.pathname = "/auth/login";

    throw redirect(303, target);
  }
}

export const actions = {
  /**
   * Handle user code submissions
   *
   * This action validates user code submissions by checking whether a pending device challenge for
   * the given user code exists. If the challenge is found, the client is loaded and the user is
   * asked to give consent to the client's requested scopes.
   *
   * We use form actions instead of tRPC on all OAuth routes to keep the technology barrier low for
   * devices that may not support JavaScript or modern web standards. Therefore, all OAuth
   * forms—including this one—should be validated server-side and work without JavaScript.
   */
  async code({ cookies, url, request, locals: { database } }) {
    const user = await authenticate(database, url, cookies);

    const body = await request.formData();
    const payload = Object.fromEntries(body.entries());
    const validated = z
      .object({
        user_code: z
          .string({ required_error: "Code is missing", invalid_type_error: "Code is invalid" })
          .regex(/[A-Z0-9]{3}-?[A-Z0-9]{3}/, { message: "Code is invalid" })
          .toLowerCase()
          .transform((value) => value.replace("-", "")),
      })
      .safeParse(payload);

    if (!validated.success) {
      return fail(400, { errors: validated.error.formErrors.fieldErrors });
    }

    const { user_code: userCode } = validated.data;
    let deviceChallenge: Awaited<ReturnType<typeof loadDeviceChallengeByUserCode>>;

    try {
      deviceChallenge = await loadDeviceChallengeByUserCode(database, userCode);
    } catch {
      return fail(400, { errors: { user_code: ["The device code is invalid or unknown."] } });
    }

    const consent = await loadUserConsent(database, deviceChallenge.client_id, user.id);

    if (consent) {
      await invalidateDeviceChallenge(database, deviceChallenge.id, true);

      return { consented: true };
    }

    const client = await loadClientWithScopes(database, deviceChallenge.client_id);
    // TODO: Check if user has previously given consent to this client. If yes, ...

    if (!client.active || client.revoked) {
      return fail(400, {
        errors: { consent: ["The application is currently suspended and cannot be connected."] },
      });
    }

    if (client.personal && client.user_id !== user.id) {
      return fail(400, { errors: { consent: ["You don't have permission to use this client."] } });
    }

    const { name, description, scopes } = client;
    const { nonce, signature } = await signPayload(
      { userCode, deviceChallenge: deviceChallenge.id },
      env.APP_SECRET_KEY,
    );
    cookies.set("device", `${nonce}.${signature}`, {
      path: url.pathname,
      sameSite: "strict",
      httpOnly: true,
    });

    return {
      consentPending: true,
      userCode,
      deviceChallenge: deviceChallenge.id,
      client: { name, description, scopes },
    };
  },

  async grantConsent({ cookies, url, request, locals: { database } }) {
    const user = await authenticate(database, url, cookies);
    const body = await request.formData();
    const payload = Object.fromEntries(body.entries());
    const validated = z
      .object({
        userCode: z.string(),
        deviceChallenge: z
          .number({ coerce: true })
          .int()
          .positive()
          .transform((value) => value.toString()),
      })
      .safeParse(payload);

    if (!validated.success) {
      return fail(400, { errors: validated.error.formErrors.fieldErrors });
    }

    const device = cookies.get("device");

    if (!device) {
      throw error(400, "The device code is missing");
    }

    const parts = device.split(".");
    const nonce = parts[0];
    const signature = parts[1];

    if (!nonce || !signature) {
      throw error(400, "The device code is malformed");
    }

    const { userCode, deviceChallenge } = validated.data;

    await verifySignedPayload({ userCode, deviceChallenge, signature, nonce }, env.APP_SECRET_KEY);
    await database.transaction().execute(async (trx) => {
      const { client_id, scopes } = await invalidateDeviceChallenge(trx, deviceChallenge, true);

      await grantUserConsent(
        trx,
        client_id,
        user.id,
        scopes ?? [],
        Number(env.OAUTH_CONSENT_TTL ?? 604_800),
      );
    });

    return { consented: true };
  },

  async rejectConsent({ cookies, url, request, locals: { database } }) {
    await authenticate(database, url, cookies);
    const body = await request.formData();
    const payload = Object.fromEntries(body.entries());
    const validated = z
      .object({
        userCode: z.string(),
        deviceChallenge: z
          .number()
          .int()
          .positive()
          .transform((value) => value.toString()),
      })
      .safeParse(payload);

    if (!validated.success) {
      return fail(400, { errors: validated.error.formErrors.fieldErrors });
    }

    const device = cookies.get("device");

    if (!device) {
      throw error(400, "The device code is missing.");
    }

    const parts = device.split(".");
    const nonce = parts[0];
    const signature = parts[1];

    if (!nonce || !signature) {
      throw error(400, "The device code is malformed");
    }

    const { userCode, deviceChallenge } = validated.data;

    await verifySignedPayload({ userCode, deviceChallenge, signature, nonce }, env.APP_SECRET_KEY);
    await invalidateDeviceChallenge(database, deviceChallenge, false);

    return { rejected: true };
  },
} satisfies Actions;
