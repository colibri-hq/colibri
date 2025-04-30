import type { PageLoad } from "./$types";

export const load = function load({ url }) {
  const userCode = url.searchParams.get("user_code");

  return {
    userCode: userCode?.match(/[a-zA-Z0-9]{3}-?[a-zA-Z0-9]{3}/)
      ? userCode.replace("-", "").toUpperCase()
      : undefined,
  };
} satisfies PageLoad;
