import { procedure, t } from "$lib/trpc/t";
import {
  addCollectionComment,
  createCollection,
  deleteCollection,
  isCollectionLikedByUser,
  loadCollectionComments,
  loadCollectionCommentsLegacy,
  loadCollectionForUser,
  loadCollectionsForUser,
  loadCollectionWorks,
  reorderCollectionEntries,
  toggleCollectionLike,
  toggleWorkInCollection,
  updateCollection,
} from "@colibri-hq/sdk";
import { z } from "zod";

const visibilitySchema = z.enum(["private", "shared", "public"]);

export const collections = t.router({
  list: procedure()
    .input(z.object({ book: z.string().optional() }).optional())
    .query(({ ctx: { database, userId } }) =>
      loadCollectionsForUser(database, userId),
    ),

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
    .query(({ input, ctx: { database } }) =>
      loadCollectionComments(database, input),
    ),

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
    .mutation(
      async ({ input: { book, collection }, ctx: { database, userId } }) => {
        return toggleWorkInCollection(database, collection, book, userId);
      },
    ),

  save: procedure()
    .input(
      z.object({
        id: z.string().nullable().optional(),
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        icon: z.string().nullable().optional(),
        color: z.string().nullable().optional(), // Hex color string like "#ff0000"
        visibility: visibilitySchema.optional(),
        ageRequirement: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ input, ctx: { database, userId } }) => {
      const { id, name, description, icon, color, visibility, ageRequirement } =
        input;

      // Convert visibility string to shared boolean
      // private = false, shared = null, public = true
      const shared =
        visibility === "private"
          ? false
          : visibility === "public"
            ? true
            : null;

      // Convert hex color string to Buffer if provided
      const colorBuffer = color
        ? Buffer.from(color.replace("#", ""), "hex")
        : undefined;

      if (id) {
        return updateCollection(database, id, userId, {
          name,
          description,
          icon,
          color: colorBuffer,
          shared,
          ageRequirement,
        });
      } else {
        if (!name) {
          throw new Error("No collection name provided");
        }
        return createCollection(database, userId, {
          name,
          description,
          icon,
          color: colorBuffer,
          shared,
          ageRequirement,
        });
      }
    }),

  delete: procedure()
    .input(z.string())
    .mutation(async ({ input: id, ctx: { database, userId } }) => {
      // Verify the user owns the collection before deleting
      const collection = await loadCollectionForUser(database, id, userId);
      if (collection.created_by?.toString() !== userId) {
        throw new Error("Not authorized to delete this collection");
      }
      await deleteCollection(database, id);
    }),

  toggleLike: procedure()
    .input(z.string())
    .mutation(({ input: collectionId, ctx: { database, userId } }) =>
      toggleCollectionLike(database, collectionId, userId),
    ),

  isLiked: procedure()
    .input(z.string())
    .query(({ input: collectionId, ctx: { database, userId } }) =>
      isCollectionLikedByUser(database, collectionId, userId),
    ),

  reorderEntries: procedure()
    .input(
      z.object({
        collectionId: z.string(),
        entries: z.array(
          z.object({
            workId: z.string(),
            position: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx: { database, userId } }) => {
      // Verify the user can edit this collection
      const collection = await loadCollectionForUser(
        database,
        input.collectionId,
        userId,
      );
      if (collection.created_by?.toString() !== userId) {
        throw new Error("Not authorized to reorder this collection");
      }
      await reorderCollectionEntries(
        database,
        input.collectionId,
        input.entries,
        userId,
      );
    }),
});
