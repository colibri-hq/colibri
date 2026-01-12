/**
 * Scopes Module
 *
 * Provides the unified scope registry and service functions for
 * permission management across API keys and OAuth.
 *
 * @example
 * import {
 *   SCOPE_REGISTRY,
 *   ALL_SCOPES,
 *   API_KEY_SCOPES,
 *   satisfiesScope,
 *   expandScopes,
 *   type ScopeName,
 * } from "@colibri-hq/sdk";
 */

// Registry exports
export {
  SCOPE_REGISTRY,
  ALL_SCOPES,
  API_KEY_SCOPES,
  type ScopeName,
  type ApiKeyScope,
  type ScopeDefinition,
} from "./registry.js";

// Service exports
export {
  expandScope,
  expandScopes,
  satisfiesScope,
  satisfiesAllScopes,
  satisfiesAnyScope,
  isValidScope,
  validateScopes,
  filterValidScopes,
  getScopesByCategory,
  getScopeDescription,
} from "./service.js";
