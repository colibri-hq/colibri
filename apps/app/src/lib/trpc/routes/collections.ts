import { procedure, t } from "$lib/trpc/t";
import {
  addCollectionComment,
  loadCollectionComments,
  loadCollectionCommentsLegacy,
  loadCollectionForUser,
  loadCollectionsForUser,
  loadCollectionWorks,
} from "@colibri-hq/sdk";
import { z } from "zod";

export const collections = t.router({
  list: procedure()
    .input(z.object({ book: z.string().optional() }).optional())
    .query(({ ctx: { database, userId } }) => loadCollectionsForUser(database, userId)),

  load: procedure()
    .input(z.string())
    .query(({ input, ctx: { database, userId } }) =>
      loadCollectionForUser(database, input, userId),
    ),

  loadBooks: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) =>
      loadCollectionWorks(database, input),
    ),

  loadCommentsWithReactions: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) =>
      loadCollectionCommentsLegacy(database, input),
    ),

  loadComments: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) => loadCollectionComments(database, input)),

  addComment: procedure()
    .input(
      z.object({
        collection: z.string(),
        content: z.string(),
      }),
    )
    .mutation(
      async ({ input: { collection, content }, ctx: { database, userId } }) => {
        await addCollectionComment(database, collection, {
          content: content,
          created_by: userId,
        });
      },
    ),

  toggleBook: procedure()
    .input(
      z.object({
        collection: z.string(),
        book: z.string(),
      }),
    )
    .mutation(async ({ input: { book, collection }, _ctx }) => {
      await prisma.$transaction(async (trx) => {
        const existsInCollection =
          0 ===
          (await trx.collection.count({
            where: {
              id: collection,
              books: {
                some: {
                  id: book,
                },
              },
            },
          }));

        await trx.collection.update({
          where: { id: collection },
          data: {
            books: {
              [existsInCollection ? "connect" : "disconnect"]: {
                id: book,
              },
            },
          },
        });
      });
    }),

  save: procedure()
    .input(
      z.object({
        id: z.string().nullable().optional(),
        name: z.string().optional(),
        icon: z.string().optional(),
      }),
    )
    .mutation(async ({ input: { id, ...rest }, ctx: { userId } }) => {
      if (id) {
        await prisma.collection.update({
          data: {
            ...rest,
            ownerId: userId,
          },
          where: { id },
        });
      } else {
        if (!rest.name) {
          throw new Error("No collection name provided");
        }

        await prisma.collection.create({
          data: {
            ...rest,
            ownerId: userId,
            name: rest.name,
          },
        });
      }
    }),
});
