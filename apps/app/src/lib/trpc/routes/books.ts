import { env } from "$env/dynamic/private";
import { relatorRoles } from "$lib/parsing/contributions";
import { generatePresignedUploadUrl } from "$lib/server/storage";
import { procedure, t, unguardedProcedure } from "$lib/trpc/t";
import {
  createBook,
  createEdition,
  findAssetByChecksum,
  loadBook,
  loadBooks,
  loadCreators,
  loadPublisher,
  loadRatings,
  loadReviews,
  updateRating,
} from "@colibri-hq/sdk";
import { decodeFromBase64 } from "@colibri-hq/shared";
import { z } from "zod";

export const books = t.router({
  list: unguardedProcedure()
    .input(
      z.object({
        query: z.string().optional(),
      }),
    )
    .query(({ input, ctx: { database } }) => loadBooks(database, input.query)),

  load: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) => loadBook(database, input)),

  loadCreators: procedure()
    .input(z.object({ bookId: z.string(), editionId: z.string().optional() }))
    .query(({ input: { bookId, editionId }, ctx: { database } }) =>
      loadCreators(database, bookId, editionId),
    ),

  loadPublisher: procedure()
    .input(z.object({ bookId: z.string(), editionId: z.string().optional() }))
    .query(({ input: { bookId, editionId }, ctx: { database } }) =>
      loadPublisher(database, bookId, editionId),
    ),

  loadRatings: procedure()
    .input(z.object({ bookId: z.string() }))
    .query(async ({ input: { bookId }, ctx: { database } }) =>
      loadRatings(database, bookId),
    ),

  updateRating: procedure()
    .input(z.object({ bookId: z.string(), rating: z.number() }))
    .mutation(
      async ({ input: { bookId, rating }, ctx: { database, userId } }) =>
        updateRating(database, bookId, userId, rating),
    ),

  loadReviews: procedure()
    .input(z.object({ bookId: z.string(), editionId: z.string().optional() }))
    .query(({ input: { bookId, editionId }, ctx: { database } }) =>
      loadReviews(database, bookId, editionId),
    ),

  save: procedure()
    .input(
      z.object({
        id: z.string().nullable().optional(),
        title: z.string().optional(),
        rating: z.number({ coerce: true }).optional(),
        description: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input: { id, ...rest }, ctx: { userId, url } }) => {
      if (!id) {
        throw new Error("Books must not be created via the JSON API");
      }
      //
      // const book = await prisma.book.update({
      //   data: {
      //     ...rest,
      //     updatedByUserId: userId
      //   },
      //   where: { id },
      //   include: {
      //     author: { select: { name: true } },
      //     publisher: { select: { name: true } }
      //   }
      // });

      // await indexBook(book, url);
    }),

  delete: procedure()
    .input(z.string())
    .mutation(async ({ input: id }) => {
      // await prisma.book.delete({ where: { id } });
    }),

  create: procedure()
    .input(
      z.object({
        asset: z.object({
          checksum: z
            .string()
            .base64()
            .transform((value) => decodeFromBase64(value)),
          mimeType: z.string().regex(/^.+\/.+/),
          size: z.number().positive(),
        }),
        title: z.string().optional().default("Untitled Book"),
        sortingKey: z.string().optional(),
        synopsis: z.string().optional(),
        rating: z.number({ coerce: true }).optional(),
        language: z.string().optional(),
        legalInformation: z.string().optional(),
        numberOfPages: z.number().optional(),
        contributors: z
          .array(
            z.object({
              name: z.string(),
              roles: z.enum(relatorRoles).array(),
              sortingKey: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx: { userId, database } }) => {
      console.log("Creating book", { input });

      const checksum = input.asset.checksum;
      const existingAsset = await findAssetByChecksum(database, checksum);

      if (existingAsset) {
        return null;
      }

      const assetUrlTest = await generatePresignedUploadUrl(
        env.S3_BUCKET_ASSETS,
        `42-42.epub`,
        3600,
        checksum,
        {
          title: input.title,
        },
      );

      if (assetUrlTest.length > 0) {
        return { assetUrl: assetUrlTest };
      }

      const { bookId, editionId } = await database
        .transaction()
        .execute(async (trx) => {
          // TODO: Check if contributors exist
          // TODO: Create contributors, one by one

          // TODO: Check if book exists
          // TODO: Create book
          const { id: bookId } = await createBook(trx, userId);

          // TODO: Check if edition exists, by comparing unique identifiers like
          //       the ISBN. If we don't have an ISBN, we will import the book as
          //       a duplicate and rely on the suggestion queue to merge them.
          // TODO: Create edition
          const { id: editionId } = await createEdition(trx, {
            book_id: bookId,
            title: input.title,
            synopsis: input.synopsis ?? null,
            language: input.language ?? null,
            legal_information: input.legalInformation ?? null,
            pages: input.numberOfPages ?? null,
            sorting_key: input.sortingKey ?? input.title,
          });

          // TODO: Update main edition for book
          // TODO: Create rating

          // TODO: Create publisher

          if (input.rating) {
            await updateRating(trx, bookId, userId, input.rating);
          }

          return { bookId, editionId };
        });

      const assetUrl = await generatePresignedUploadUrl(
        "books",
        `${bookId}-${editionId}.epub`,
        3600,
        checksum,
        {
          title: input.title,
        },
      );

      return { assetUrl };
    }),
});
