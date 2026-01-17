import { dispatchPasscode } from "$lib/server/auth";
import { procedure, t } from "$lib/trpc/t";
import {
  blockUser,
  createPasscode,
  createUser,
  findUserByEmail,
  getBlockedUsers,
  unblockUser,
  userExists,
} from "@colibri-hq/sdk";
import { inferNameFromEmailAddress } from "@colibri-hq/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const accounts = t.router({
  exists: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) => userExists(database, input)),

  create: procedure()
    .input(z.object({ name: z.string().optional(), emailAddress: z.string() }))
    .mutation(async ({ input: { emailAddress, name }, ctx: { database, platform } }) => {
      const user = await createUser(database, {
        name: name || inferNameFromEmailAddress(emailAddress),
        email: emailAddress,
      });

      const { code } = await createPasscode(database, user);

      await dispatchPasscode(platform, user, code);

      return user.id;
    }),

  requestPassCode: procedure()
    .input(z.object({ emailAddress: z.string() }))
    .mutation(async ({ input, ctx: { database, platform } }) => {
      const emailAddress = input.emailAddress;
      let user;

      try {
        user = await findUserByEmail(database, emailAddress);
      } catch {
        // User doesn't exist, create one
        user = await createUser(database, {
          name: inferNameFromEmailAddress(emailAddress),
          email: emailAddress,
        });
      }

      const { code } = await createPasscode(database, user);

      console.log(`Dispatching passcode notification with code ${code}`);
      await dispatchPasscode(platform, user, code);
    }),

  // region User Blocking

  /**
   * Block a user (hide their comments from you)
   */
  blockUser: procedure()
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input: { userId: blockedId }, ctx: { database, userId } }) => {
      if (blockedId === userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot block yourself" });
      }

      await blockUser(database, userId, blockedId);
    }),

  /**
   * Unblock a user
   */
  unblockUser: procedure()
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input: { userId: blockedId }, ctx: { database, userId } }) => {
      await unblockUser(database, userId, blockedId);
    }),

  /**
   * Get list of blocked users
   */
  getBlockedUsers: procedure().query(async ({ ctx: { database, userId } }) => {
    return getBlockedUsers(database, userId);
  }),

  // endregion
});
