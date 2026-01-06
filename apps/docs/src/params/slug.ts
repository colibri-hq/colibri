import type { ParamMatcher } from "@sveltejs/kit";

// Match slugs where the last segment doesn't end with .md or .json
export const match: ParamMatcher = (param) => {
	return !param.endsWith(".md") && !param.endsWith(".json");
};
