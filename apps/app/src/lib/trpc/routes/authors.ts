import { logger } from "$lib/trpc/middleware/logger";
import { procedure, t, unguardedProcedure } from "$lib/trpc/t";
import { z } from "zod";

export const authors = t.router({
  autocomplete: unguardedProcedure()
    .input(z.string())
    .query(({ input }) =>
      prisma.author.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "desc" },
        where: {
          name: {
            contains: input,
          },
        },
      }),
    ),

  list: unguardedProcedure()
    .input(z.string().optional())
    .query(({ input, ctx: { database } }) =>
      prisma.author.findMany({
        select: {
          id: true,
          name: true,
          updatedAt: true,
          _count: { select: { books: true } },
        },
        orderBy: { updatedAt: "desc" },
        where: input ? { name: { contains: input } } : undefined,
      }),
    ),

  loadOptions: t.procedure.use(logger).query(() =>
    prisma.author
      .findMany({
        select: { id: true, name: true },
        orderBy: [{ name: "asc" }],
      })
      .then((authors) =>
        authors.map(({ id, name }) => ({
          label: name,
          value: id,
        })),
      ),
  ),

  load: procedure()
    .input(z.string())
    .query(({ input }) =>
      prisma.author.findUniqueOrThrow({
        where: { id: input },
        include: {
          books: true,
        },
      }),
    ),

  fetchInfo: procedure()
    .input(z.string())
    .query(({ input, ctx: { platform } }) =>
      query(platform, input, ["Person"]),
    ),

  update: procedure()
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(3).max(50).optional(),
        description: z.string().optional(),
        wikipediaUrl: z.string().optional(),
        pictureUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input: { id, ...rest }, ctx: { userId } }) => {
      console.log({
        data: { ...rest, updatedByUserId: userId },
        where: { id },
      });
      await prisma.author.update({
        data: { ...rest, updatedByUserId: userId },
        where: { id },
      });
    }),

  save: procedure()
    .input(
      z.object({
        id: z.string().nullable(),
        name: z.string().min(3).max(50),
        description: z.string().nullable(),
      }),
    )
    .mutation(async ({ input: { id, ...rest }, ctx: { userId } }) => {
      if (id) {
        await prisma.author.update({
          data: { ...rest, updatedByUserId: userId },
          where: { id },
        });
      } else {
        await prisma.author.create({
          data: { ...rest, updatedByUserId: userId },
        });
      }
    }),

  delete: procedure()
    .input(z.string())
    .mutation(async ({ input: id }) => {
      await prisma.author.delete({ where: { id } });
    }),
});
