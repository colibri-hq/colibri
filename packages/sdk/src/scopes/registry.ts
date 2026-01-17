/**
 * Scope Registry - Single source of truth for all permission scopes.
 *
 * This module defines all available scopes used by API keys and OAuth.
 * The registry is code-first: TypeScript is the source of truth,
 * and the database `authentication.scope` table syncs from this.
 */

export interface ScopeDefinition {
  /** Human-readable description shown in UI */
  description: string;
  /** Other scopes this scope grants access to (hierarchical) */
  implies?: readonly string[];
  /** Category for UI grouping */
  category: "library" | "progress" | "system" | "admin";
  /** Whether this scope can be granted to API keys (vs OAuth-only) */
  apiKeyAllowed: boolean;
}

/**
 * Central registry of all permission scopes.
 *
 * Naming convention: `resource:action` (e.g., `library:read`)
 *
 * Hierarchy: A scope with `implies` automatically grants those scopes too.
 * For example, `library:write` implies `library:read`.
 */
export const SCOPE_REGISTRY = {
  // Library scopes
  "library:read": {
    description: "Read library books and metadata",
    category: "library",
    apiKeyAllowed: true,
  },
  "library:write": {
    description: "Add, edit, and delete books",
    implies: ["library:read"],
    category: "library",
    apiKeyAllowed: true,
  },
  "library:download": {
    description: "Download book files",
    implies: ["library:read"],
    category: "library",
    apiKeyAllowed: true,
  },

  // Progress scopes
  "progress:read": {
    description: "Read reading progress and bookmarks",
    category: "progress",
    apiKeyAllowed: true,
  },
  "progress:write": {
    description: "Update reading progress and bookmarks",
    implies: ["progress:read"],
    category: "progress",
    apiKeyAllowed: true,
  },

  // System scopes (OAuth only for now)
  "instance:read": {
    description: "Read instance settings",
    category: "system",
    apiKeyAllowed: false,
  },
  "instance:write": {
    description: "Modify instance settings",
    implies: ["instance:read"],
    category: "system",
    apiKeyAllowed: false,
  },

  // Admin scope - grants everything
  admin: {
    description: "Full administrative access",
    implies: ["library:write", "library:download", "progress:write", "instance:write"],
    category: "admin",
    apiKeyAllowed: true,
  },
} as const satisfies Record<string, ScopeDefinition>;

/** Union type of all valid scope names, derived from registry */
export type ScopeName = keyof typeof SCOPE_REGISTRY;

/** Array of all scope names */
export const ALL_SCOPES = Object.keys(SCOPE_REGISTRY) as ScopeName[];

/** Scopes that can be granted to API keys (as tuple for zod.enum compatibility) */
export const API_KEY_SCOPES = [
  "library:read",
  "library:write",
  "library:download",
  "progress:read",
  "progress:write",
  "admin",
] as const satisfies readonly ScopeName[];

/** Type alias for API key-allowed scopes */
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
