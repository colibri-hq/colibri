// Resolution functions
export {
  resolveLanguage,
  resolveLanguages,
  isValidLanguageCode,
} from "./resolve.js";

// Direct index access
export {
  getLanguageByIso3,
  getLanguageByIso1,
  getLanguageByName,
  getAllLanguages,
  getLanguageCount,
} from "./indexes.js";

// Types
export type {
  Language,
  LanguageType,
  MatchType,
  ResolvedLanguage,
} from "./types.js";
