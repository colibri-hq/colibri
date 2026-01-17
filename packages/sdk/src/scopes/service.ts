/**
 * Scope Service - Functions for working with scopes.
 *
 * Provides scope expansion (hierarchical resolution), validation,
 * and permission checking utilities.
 */

import { ALL_SCOPES, SCOPE_REGISTRY, type ScopeName } from "./registry.js";

/**
 * Expand a single scope to include all scopes it implies (recursively).
 *
 * @example
 * expandScope("library:write")
 * // Returns Set { "library:write", "library:read" }
 *
 * @example
 * expandScope("admin")
 * // Returns Set with all scopes
 */
export function expandScope(scope: ScopeName): Set<ScopeName> {
  const result = new Set<ScopeName>([scope]);
  const definition = SCOPE_REGISTRY[scope];

  if ("implies" in definition && definition.implies) {
    for (const implied of definition.implies) {
      // Recursively expand implied scopes
      const impliedScope = implied as ScopeName;
      if (impliedScope in SCOPE_REGISTRY) {
        for (const s of expandScope(impliedScope)) {
          result.add(s);
        }
      }
    }
  }

  return result;
}

/**
 * Expand multiple scopes to their full set of effective permissions.
 *
 * @example
 * expandScopes(["library:write", "progress:read"])
 * // Returns Set { "library:write", "library:read", "progress:read" }
 */
export function expandScopes(scopes: readonly ScopeName[]): Set<ScopeName> {
  const result = new Set<ScopeName>();
  for (const scope of scopes) {
    for (const s of expandScope(scope)) {
      result.add(s);
    }
  }
  return result;
}

/**
 * Check if granted scopes satisfy a required scope.
 *
 * Takes hierarchical implications into account.
 *
 * @example
 * satisfiesScope(["library:write"], "library:read") // true (implied)
 * satisfiesScope(["library:read"], "library:write") // false
 * satisfiesScope(["admin"], "progress:write") // true (admin implies all)
 */
export function satisfiesScope(
  grantedScopes: readonly string[],
  requiredScope: ScopeName,
): boolean {
  // Filter to only valid scope names before expanding
  const validScopes = grantedScopes.filter((s): s is ScopeName => s in SCOPE_REGISTRY);
  const expanded = expandScopes(validScopes);
  return expanded.has(requiredScope);
}

/**
 * Check if granted scopes satisfy ALL required scopes.
 *
 * @example
 * satisfiesAllScopes(["admin"], ["library:read", "progress:write"]) // true
 * satisfiesAllScopes(["library:read"], ["library:read", "progress:write"]) // false
 */
export function satisfiesAllScopes(
  grantedScopes: readonly string[],
  requiredScopes: readonly ScopeName[],
): boolean {
  return requiredScopes.every((s) => satisfiesScope(grantedScopes, s));
}

/**
 * Check if granted scopes satisfy ANY of the required scopes.
 *
 * @example
 * satisfiesAnyScope(["library:read"], ["library:read", "progress:write"]) // true
 * satisfiesAnyScope(["instance:read"], ["library:read", "progress:write"]) // false
 */
export function satisfiesAnyScope(
  grantedScopes: readonly string[],
  requiredScopes: readonly ScopeName[],
): boolean {
  return requiredScopes.some((s) => satisfiesScope(grantedScopes, s));
}

/**
 * Validate that a string is a valid scope name.
 */
export function isValidScope(scope: string): scope is ScopeName {
  return scope in SCOPE_REGISTRY;
}

/**
 * Validate that all strings in an array are valid scope names.
 */
export function validateScopes(scopes: readonly string[]): scopes is ScopeName[] {
  return scopes.every(isValidScope);
}

/**
 * Filter an array to only valid scope names.
 */
export function filterValidScopes(scopes: readonly string[]): ScopeName[] {
  return scopes.filter(isValidScope);
}

/**
 * Get scopes grouped by category for UI display.
 *
 * @example
 * const groups = getScopesByCategory();
 * // { library: [...], progress: [...], system: [...], admin: [...] }
 */
export function getScopesByCategory(): Record<
  string,
  Array<{ name: ScopeName; description: string; apiKeyAllowed: boolean }>
> {
  const groups: Record<
    string,
    Array<{ name: ScopeName; description: string; apiKeyAllowed: boolean }>
  > = {};

  for (const name of ALL_SCOPES) {
    const def = SCOPE_REGISTRY[name];
    if (!groups[def.category]) {
      groups[def.category] = [];
    }
    groups[def.category].push({
      name,
      description: def.description,
      apiKeyAllowed: def.apiKeyAllowed,
    });
  }

  return groups;
}

/**
 * Get the description for a scope.
 */
export function getScopeDescription(scope: ScopeName): string {
  return SCOPE_REGISTRY[scope].description;
}
