import { paginatable, paginatedResults, procedure, t } from '$lib/trpc/t';
import {
  createUser,
  findUserByIdentifier,
  listAuthenticatorsForUser,
  listUsers,
  removeAuthenticator,
  type UpdatableUser,
  updateUser,
} from '@colibri-hq/sdk';
import type { AuthenticationUserRole } from '@colibri-hq/sdk/schema';
import { signUrl } from '@colibri-hq/shared';
import { z } from 'zod';
import { APP_SECRET_KEY } from '$env/static/private';

export const users = t.router({
  list: procedure()
    .input(paginatable({}))
    .query(async ({ input: { page, perPage }, ctx: { database } }) =>
      paginatedResults<Awaited<ReturnType<typeof listUsers>>[number]>(
        listUsers(database, page, perPage),
      ),
    ),

  /**
   * Retrieves a user by identifier.
   */
  load: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) =>
      findUserByIdentifier(database, input),
    ),

  /**
   * Retrieves the current user.
   */
  current: procedure().query(({ ctx: { database, userId } }) =>
    findUserByIdentifier(database, userId),
  ),

  /**
   * Retrieves all authenticators for the current user.
   */
  authenticatorsForCurrent: procedure().query(({ ctx: { database, userId } }) =>
    listAuthenticatorsForUser(database, userId),
  ),

  updateCurrentEmail: procedure()
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      // TODO: Send confirmation mail
      return updateUser(ctx.database, ctx.userId, {
        email: input,
        verified: false,
      });
    }),

  /**
   * Updates the current user.
   */
  updateCurrent: procedure()
    .input(
      z.object({
        name: z.string().optional(),
        colorScheme: z.enum(['system', 'light', 'dark']).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const data: UpdatableUser = {};

      if (input.name) {
        data.name = input.name;
      }

      if (input.colorScheme) {
        data.color_scheme = input.colorScheme;
      }

      return updateUser(ctx.database, ctx.userId, data);
    }),

  /**
   * Removes an authenticator.
   */
  removeAuthenticator: procedure()
    .input(z.string())
    .mutation(async ({ input, ctx: { database } }) =>
      removeAuthenticator(database, input),
    ),

  generateInvitationLink: procedure()
    .input(
      z.object({
        email: z.string().email(),
        role: z
          .enum([
            'admin' as AuthenticationUserRole,
            'adult' as AuthenticationUserRole,
            'child' as AuthenticationUserRole,
          ] as const)
          .default('adult'),
        expiresAt: z.coerce.date().optional(),
      }),
    )
    .query(({ input: { email, role, expiresAt }, ctx: { url, userId } }) => {
      const link = new URL(`/invitations/accept`, url);
      link.searchParams.set('by', userId);
      link.searchParams.set('to', email);
      link.searchParams.set('as', role);

      if (expiresAt) {
        link.searchParams.set('ttl', expiresAt.toISOString());
      }

      return signUrl(link, APP_SECRET_KEY);
    }),

  createUser: procedure()
    .input(
      z.object({
        name: z.string(),
        emailAddress: z.string().email(),
        birthDate: z.coerce.date().optional(),
        role: z
          .enum([
            'admin' as AuthenticationUserRole,
            'adult' as AuthenticationUserRole,
            'child' as AuthenticationUserRole,
          ] as const)
          .default('adult'),
      }),
    )
    .mutation(
      ({ input: { name, emailAddress, birthDate, role }, ctx: { database } }) =>
        createUser(database, {
          birthdate: birthDate ?? null,
          name: name,
          email: emailAddress,
          verified: true,
          role,
        }),
    ),
});
