import { procedure, t } from "$lib/trpc/t";
import { searchLanguages } from "@colibri-hq/sdk";
import { z } from "zod";

export const languages = t.router({
  autocomplete: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) => searchLanguages(database, input)),
});
