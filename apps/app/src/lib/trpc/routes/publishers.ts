import { procedure, t } from "$lib/trpc/t";
import {
  listPublishers,
  loadWorksForPublisher,
  loadCreatorsForPublisher,
  loadPublisher,
} from "@colibri-hq/sdk";
import { z } from "zod";

export const publishers = t.router({
  list: procedure()
    .input(z.string().optional())
    .query(({ input, ctx: { database } }) => listPublishers(database, input)),

  load: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) => loadPublisher(database, input)),

  loadBooksForPublisher: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) =>
      loadWorksForPublisher(database, input),
    ),

  loadCreatorsForPublisher: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) =>
      loadCreatorsForPublisher(database, input),
    ),

  save: procedure()
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(3).max(50).optional(),
        description: z.string().optional(),
        wikipediaUrl: z.string().optional(),
        logoUrl: z.string().optional(),
      }),
    )
    .mutation(({ input: { id, ...rest }, ctx: { userId } }) => {
      if (id) {
        // return prisma.publisher.update({
        //   data: { ...rest, updatedByUserId: userId },
        //   where: { id }
        // });
      }

      // return prisma.publisher.create({
      //   data: { ...rest, name: rest.name || 'Unknown Publisher', updatedByUserId: userId }
      // });
    }),

  fetchInfo: procedure()
    .input(z.string())
    .query(
      ({ input, ctx: { platform } }) => [],
      // query(platform, input, ['Organization'])
    ),

  autocomplete: procedure()
    .input(z.string())
    .query(
      ({ input }) => [],
      // prisma.publisher.findMany({
      //   select: {
      //     id: true,
      //     name: true
      //   },
      //   orderBy: { name: 'desc' },
      //   where: {
      //     name: {
      //       contains: input
      //     }
      //   }
      // })
    ),
});
