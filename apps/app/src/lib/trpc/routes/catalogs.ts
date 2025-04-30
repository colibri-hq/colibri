import { fetchCatalog } from "$lib/catalogs/catalog";
import { paginatable, paginatedResults, procedure, t } from "$lib/trpc/t";
import {
  createCatalog,
  loadCatalog,
  loadCatalogs,
  updateCatalog,
} from "@colibri-hq/sdk";
import { z } from "zod";

export const catalogs = t.router({
  list: procedure()
    .input(
      paginatable({
        query: z.string().optional(),
      }),
    )
    .query(
      async ({
        input: { query = undefined, page, perPage },
        ctx: { database },
      }) => paginatedResults(loadCatalogs(database, query, page, perPage)),
    ),

  load: procedure()
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(({ input: { id }, ctx: { database } }) => loadCatalog(database, id)),

  enable: procedure()
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(({ input: { id }, ctx: { database } }) =>
      updateCatalog(database, id, { active: true }),
    ),

  disable: procedure()
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(({ input: { id }, ctx: { database } }) =>
      updateCatalog(database, id, { active: false }),
    ),

  fetchRemoteCatalog: procedure()
    .input(
      z.object({
        feedUrl: z.string().url("Invalid feed URL"),
        resolveRoot: z.boolean().optional(),
      }),
    )
    .query(({ input: { feedUrl, resolveRoot = false } }) =>
      fetchCatalog(feedUrl, resolveRoot),
    ),

  addCatalog: procedure()
    .input(
      z.object({
        feedUrl: z.string().url("Invalid feed URL"),
        title: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().url("Invalid image URL").optional(),
      }),
    )
    .mutation(
      ({
        input: { description, feedUrl, imageUrl, title },
        ctx: { database },
      }) =>
        createCatalog(database, {
          feed_url: feedUrl,
          title: title ?? null,
          description: description ?? null,
          image_url: imageUrl ?? null,
        }),
    ),
});
