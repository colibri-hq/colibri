import {
  addCollectionComment,
  loadCollectionBooks,
  loadCollectionComments,
  loadCollectionCommentsLegacy,
  loadCollectionForUser,
  loadCollectionsForUser,
} from '@colibri-hq/sdk';
import { procedure, t } from '$lib/trpc/t';
import { z } from 'zod';

export const collections = t.router({
  list: procedure()
    .input(z.object({ book: z.string().optional() }).optional())
    .query(({ ctx }) => loadCollectionsForUser(ctx.database, ctx.userId)),

  load: procedure()
    .input(z.string())
    .query(({ input, ctx }) =>
      loadCollectionForUser(ctx.database, input, ctx.userId),
    ),

  loadBooks: procedure()
    .input(z.string())
    .query(({ input, ctx }) => loadCollectionBooks(ctx.database, input)),

  loadCommentsWithReactions: procedure()
    .input(z.string())
    .query(({ input, ctx }) =>
      loadCollectionCommentsLegacy(ctx.database, input),
    ),

  loadComments: procedure()
    .input(z.string())
    .query(({ input, ctx }) => loadCollectionComments(ctx.database, input)),

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
      await prisma.$transaction(async (tx) => {
        const existsInCollection =
          0 ===
          (await tx.collection.count({
            where: {
              id: collection,
              books: {
                some: {
                  id: book,
                },
              },
            },
          }));

        await tx.collection.update({
          where: { id: collection },
          data: {
            books: {
              [existsInCollection ? 'connect' : 'disconnect']: {
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
          throw new Error('No collection name provided');
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
