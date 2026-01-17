/**
 * Icon URN utilities for parsing and creating icon identifiers.
 *
 * URN Format: `urn:colibri:icon:<type>:<value>`
 *
 * Supported types:
 * - `mdi` - Material Design icons (e.g., `urn:colibri:icon:mdi:favorite`)
 * - `emoji` - Unicode emojis (e.g., `urn:colibri:icon:emoji:❤️`)
 * - `custom` - Custom icons with URL (e.g., `urn:colibri:icon:custom:https://...`)
 */

export type IconType = "mdi" | "emoji" | "custom";

export interface ParsedIcon {
  type: IconType;
  value: string;
}

const URN_PREFIX = "urn:colibri:icon:";

/**
 * Pattern matching Material Design icon names (lowercase letters, numbers, underscores).
 */
const MDI_PATTERN = /^[a-z0-9_]+$/;

/**
 * Parse an icon URN into its type and value components.
 *
 * Handles legacy values (non-URN strings) by inferring the type:
 * - Strings matching MDI pattern → treated as MDI icons
 * - Other strings → treated as emojis
 *
 * @param urn - The icon URN string to parse
 * @returns Parsed icon object or null if invalid/empty
 */
export function parseIconUrn(urn: string | null | undefined): ParsedIcon | null {
  if (!urn) {
    return null;
  }

  // Handle legacy values (non-URN strings)
  if (!urn.startsWith(URN_PREFIX)) {
    // Legacy: assume it's an MDI icon name if it looks like one
    if (MDI_PATTERN.test(urn)) {
      return { type: "mdi", value: urn };
    }
    // Otherwise assume it's an emoji
    return { type: "emoji", value: urn };
  }

  const remainder = urn.slice(URN_PREFIX.length);
  const colonIndex = remainder.indexOf(":");
  if (colonIndex === -1) {
    return null;
  }

  const type = remainder.slice(0, colonIndex);
  const value = remainder.slice(colonIndex + 1);

  if (!isValidIconType(type) || !value) {
    return null;
  }

  return { type, value };
}

function isValidIconType(type: string): type is IconType {
  return type === "mdi" || type === "emoji" || type === "custom";
}

/**
 * Create an icon URN from type and value.
 */
export function createIconUrn(type: IconType, value: string): string {
  return `${URN_PREFIX}${type}:${value}`;
}

/**
 * Create an MDI (Material Design Icon) URN.
 */
export function createMdiIconUrn(iconName: string): string {
  return createIconUrn("mdi", iconName);
}

/**
 * Create an emoji icon URN.
 */
export function createEmojiIconUrn(emoji: string): string {
  return createIconUrn("emoji", emoji);
}

/**
 * Create a custom icon URN with a URL.
 */
export function createCustomIconUrn(url: string): string {
  return createIconUrn("custom", url);
}

/**
 * Type guard to check if parsed icon is an MDI icon.
 */
export function isMdiIcon(parsed: ParsedIcon | null): parsed is ParsedIcon & { type: "mdi" } {
  return parsed?.type === "mdi";
}

/**
 * Type guard to check if parsed icon is an emoji.
 */
export function isEmoji(parsed: ParsedIcon | null): parsed is ParsedIcon & { type: "emoji" } {
  return parsed?.type === "emoji";
}

/**
 * Type guard to check if parsed icon is a custom icon.
 */
export function isCustomIcon(parsed: ParsedIcon | null): parsed is ParsedIcon & { type: "custom" } {
  return parsed?.type === "custom";
}

/**
 * Extract the value from an icon URN.
 *
 * Convenience function that parses the URN and returns just the value.
 */
export function getIconValue(urn: string | null | undefined): string | null {
  const parsed = parseIconUrn(urn);
  return parsed?.value ?? null;
}

/**
 * Extract the type from an icon URN.
 *
 * Convenience function that parses the URN and returns just the type.
 */
export function getIconType(urn: string | null | undefined): IconType | null {
  const parsed = parseIconUrn(urn);
  return parsed?.type ?? null;
}
