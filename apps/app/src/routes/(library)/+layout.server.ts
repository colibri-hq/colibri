import { ensureLoggedIn } from "$lib/server/utilities";
import { getSettingValue } from "@colibri-hq/sdk";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({
  cookies,
  url,
  parent,
  locals: { database },
}) => {
  const authData = parent();
  await ensureLoggedIn(cookies, url, authData);

  const moderationEnabled = await getSettingValue(
    database,
    "urn:colibri:settings:content:moderation-enabled",
  );

  return { moderationEnabled };
};
