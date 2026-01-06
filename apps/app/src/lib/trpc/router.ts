import { accounts } from "$lib/trpc/routes/acounts";
import { books } from "$lib/trpc/routes/books";
import { catalogs } from "$lib/trpc/routes/catalogs";
import { collections } from "$lib/trpc/routes/collections";
import { comments } from "$lib/trpc/routes/comments";
import { creators } from "$lib/trpc/routes/creators";
import { languages } from "$lib/trpc/routes/languages";
import { notifications } from "$lib/trpc/routes/notifications";
import { publishers } from "$lib/trpc/routes/publishers";
import { search } from "$lib/trpc/routes/search";
import { settings } from "$lib/trpc/routes/settings";
import { users } from "$lib/trpc/routes/users";
import { t } from "$lib/trpc/t";
import {
  type inferRouterInputs,
  type inferRouterOutputs,
  type RouterCaller,
} from "@trpc/server";

export const router = t.router({
  accounts,
  books,
  catalogs,
  collections,
  comments,
  creators,
  languages,
  notifications,
  publishers,
  search,
  settings,
  users,
});

export const createCaller: RouterCaller<Router["_def"]> =
  t.createCallerFactory(router);

export type Router = typeof router;
export type RouterInputs = inferRouterInputs<Router>;
export type RouterOutputs = inferRouterOutputs<Router>;
