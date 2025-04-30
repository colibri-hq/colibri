import type { ParamMatcher } from "@sveltejs/kit";

export const match: ParamMatcher = (param) => {
  for (const segment of param.split("/")) {
    if (!/^[A-Za-z0-9_-]*[.=]{0,2}$/.test(segment)) {
      return false;
    }
  }

  return true;
};
