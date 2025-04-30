// @ts-nocheck
import { trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load = async (event: Parameters<PageLoad>[0]) => {
  const pageData = await event.parent();
  const user = event.data.user;
  const authenticators =
    await trpc(event).users.authenticatorsForCurrent.query();

  return {
    ...event.data,
    ...pageData,
    user,
    authenticators,
  };
};
