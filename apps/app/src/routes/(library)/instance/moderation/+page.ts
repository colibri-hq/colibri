import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
  // Data is loaded client-side via tRPC to enable admin-only access check
  return {};
};
