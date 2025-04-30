import { dispatchPasscode } from "$lib/server/auth";
import { procedure, t } from "$lib/trpc/t";
import { userExists } from "@colibri-hq/sdk";
import {
  generateRandomDigits,
  inferNameFromEmailAddress,
} from "@colibri-hq/shared";
import { z } from "zod";

export const accounts = t.router({
  exists: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) => userExists(database, input)),

  create: procedure()
    .input(
      z.object({
        name: z.string().optional(),
        emailAddress: z.string(),
      }),
    )
    .mutation(async ({ input: { emailAddress, name }, ctx: { platform } }) => {
      const user = await prisma.user.create({
        data: {
          name: name || inferNameFromEmailAddress(emailAddress),
          email: emailAddress,
          passwordHash: "",
        },
      });

      const code = generateRandomDigits(6);

      await prisma.passCode.create({
        data: {
          expiresAt: new Date(+new Date() + 60_000 * 5),
          userId: user.id,
          code,
        },
      });

      await dispatchPasscode(platform, user, code);

      return user.id;
    }),

  requestPassCode: procedure()
    .input(
      z.object({
        emailAddress: z.string(),
      }),
    )
    .mutation(async ({ input, ctx: { platform } }) => {
      const emailAddress = input.emailAddress;
      let user = await prisma.user.findUnique({
        where: { email: emailAddress },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            name: inferNameFromEmailAddress(emailAddress),
            email: emailAddress,
            passwordHash: "",
          },
        });
      }

      const code = generateRandomDigits(6);

      await prisma.passCode.create({
        data: {
          expiresAt: new Date(+new Date() + 60_000 * 5),
          userId: user.id,
          code,
        },
      });

      console.log(`Dispatching passcode notification with code ${code}`);
      await dispatchPasscode(platform, user, code);
    }),
});
