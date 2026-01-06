import { procedure, t } from "$lib/trpc/t";
import { findUserByIdentifier, type User } from "@colibri-hq/sdk";
import { TRPCError } from "@trpc/server";

/**
 * Admin procedure - extends the base guarded procedure with admin role check.
 * Only users with role "admin" can access procedures using this.
 */
export function adminProcedure() {
  return procedure().use(
    t.middleware(async ({ next, ctx }) => {
      const user = await findUserByIdentifier(ctx.database, ctx.userId);

      if (!user || user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      return next({
        ctx: {
          ...ctx,
          user,
        },
      });
    }),
  );
}

/**
 * Extended context type with user information available after admin check.
 */
export type AdminContext = {
  user: User;
};
