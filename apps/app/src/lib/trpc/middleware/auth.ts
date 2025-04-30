import type { Trpc } from "$lib/trpc/t";
import { TRPCError } from "@trpc/server";

export function auth(t: Trpc) {
  return t.middleware(async function auth({ next, ctx, meta }) {
    if (!meta?.guarded) {
      return next();
    }

    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }

    return next();
  });
}
