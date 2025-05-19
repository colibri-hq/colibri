import { relatorRoles } from "$lib/parsing/contributions";
import { uploadUrl } from "$lib/server/storage";
import { procedure, t, unguardedProcedure } from "$lib/trpc/t";
import {
  createBook,
  createEdition,
  findAssetByChecksum,
  loadBook,
  loadBooks,
  loadCreators,
  loadLanguage,
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
    .mutation(
      async ({
        input: {
          numberOfPages,
          legalInformation,
          sortingKey,
          rating,
          title,
          language: languageCode,
          synopsis,
          asset,
        },
        ctx: { userId, database },
      }) => {
        const checksum = asset.checksum;
        const existingAsset = await findAssetByChecksum(database, checksum);

        if (existingAsset) {
          return null;
        }

        const language = languageCode
          ? await loadLanguage(database, languageCode)
          : undefined;

        const { bookId, editionId } = await database
          .transaction()
          .execute(async (trx) => {
            // TODO: Check if contributors exist
            // TODO: Create contributors, one by one

            // TODO: Check if book exists
            const { id: bookId } = await createBook(trx, userId);

            // TODO: Check if edition exists, by comparing unique identifiers like
            //       the ISBN. If we don't have an ISBN, we will import the book as
            //       a duplicate and rely on the suggestion queue to merge them.
            const { id: editionId } = await createEdition(trx, {
              book_id: bookId,
              title,
              synopsis: synopsis ?? null,
              language: language?.iso_639_3 ?? null,
              legal_information: legalInformation ?? null,
              pages: numberOfPages ?? null,
              sorting_key: sortingKey ?? title,
            });

            // TODO: Update main edition for book
            // TODO: Create rating

            // TODO: Create publisher

            if (rating) {
              await updateRating(trx, bookId, userId, rating);
            }

            return { bookId, editionId };
          });

        const assetUrl = await uploadUrl(
          "books",
          `${bookId}-${editionId}.epub`,
          3600,
          checksum,
          { title },
        );

        return { assetUrl };
      },
    ),
});
