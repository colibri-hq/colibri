import type { ParamMatcher } from "@sveltejs/kit";

export const match: ParamMatcher = (param) => {
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
    param,
  );
};
