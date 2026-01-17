import { procedure, t } from "$lib/trpc/t";
import {
  createApiKey,
  listApiKeysForUser,
  revokeApiKey,
  rotateApiKey,
  API_KEY_SCOPES,
  type ApiKeyScope,
} from "@colibri-hq/sdk";
import { z } from "zod";

export const apiKeys = t.router({
  /**
   * List all API keys for the current user.
   * Returns key metadata without the actual key value.
   */
  list: procedure().query(async ({ ctx }) => {
    const keys = await listApiKeysForUser(ctx.database, ctx.userId);

    // Return safe metadata only (no key_hash)
    return keys.map((key) => ({
      id: key.id.toString(),
      name: key.name,
      prefix: key.key_prefix,
      scopes: key.scopes,
      lastUsedAt: key.last_used_at,
      lastUsedIp: key.last_used_ip,
      expiresAt: key.expires_at,
      createdAt: key.created_at,
    }));
  }),

  /**
   * Create a new API key.
   * Returns the plain text key ONCE - it cannot be retrieved later.
   */
  create: procedure()
    .input(
      z.object({
        name: z.string().min(1, "Name is required").max(100, "Name too long"),
        scopes: z.array(z.enum(API_KEY_SCOPES)).optional(),
        expiresAt: z.coerce.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { apiKey, plainTextKey } = await createApiKey(ctx.database, ctx.userId, input.name, {
        scopes: input.scopes as ApiKeyScope[] | undefined,
        expiresAt: input.expiresAt,
      });

      return {
        id: apiKey.id.toString(),
        name: apiKey.name,
        prefix: apiKey.key_prefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expires_at,
        createdAt: apiKey.created_at,
        // Return plain text key ONLY on creation
        key: plainTextKey,
      };
    }),

  /**
   * Revoke an API key immediately.
   */
  revoke: procedure()
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      await revokeApiKey(ctx.database, input, ctx.userId);
      return { success: true };
    }),

  /**
   * Rotate an API key - creates new key, old key works for 15 minutes.
   * Returns the new plain text key ONCE.
   */
  rotate: procedure()
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const { apiKey, plainTextKey } = await rotateApiKey(ctx.database, input, ctx.userId);

      return {
        id: apiKey.id.toString(),
        name: apiKey.name,
        prefix: apiKey.key_prefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expires_at,
        createdAt: apiKey.created_at,
        // Return plain text key ONLY on rotation
        key: plainTextKey,
      };
    }),
});
