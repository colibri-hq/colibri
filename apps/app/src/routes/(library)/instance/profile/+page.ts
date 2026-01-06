import { trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const pageData = await event.parent();
  const user = event.data.user;
  const [authenticators, notificationPreferences] = await Promise.all([
    trpc(event).users.authenticatorsForCurrent.query(),
    trpc(event).notifications.getPreferences.query(),
  ]);

  return {
    ...event.data,
    ...pageData,
    user,
    authenticators,
    notificationPreferences,
  };
};
