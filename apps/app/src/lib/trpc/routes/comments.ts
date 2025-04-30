import { procedure, t } from "$lib/trpc/t";
import { z } from "zod";

export const comments = t.router({
  addReaction: procedure()
    .input(
      z.object({
        commentId: z.string(),
        emoji: z.string(),
      }),
    )
    .mutation(
      async ({ input: { commentId, emoji }, ctx: { database, userId } }) => {
        await database
          .insertInto("comment_reaction")
          .values({
            comment_id: commentId,
            user_id: userId,
            emoji,
          })
          .onConflict((eb) =>
            eb.constraint("comment_reaction_pkey").doUpdateSet({ emoji }),
          )
          .execute();
      },
    ),

  removeReaction: procedure()
    .input(
      z.object({
        commentId: z.string(),
        emoji: z.string(),
      }),
    )
    .mutation(
      async ({ input: { commentId, emoji }, ctx: { database, userId } }) => {
        await database
          .deleteFrom("comment_reaction")
          .where("comment_id", "=", commentId)
          .where("user_id", "=", userId)
          .where("emoji", "=", emoji)
          .execute();
      },
    ),
});
