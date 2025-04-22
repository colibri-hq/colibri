import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => {
  return /^[A-Za-z0-9_-]*[.=]{0,2}$/.test(param);
};
