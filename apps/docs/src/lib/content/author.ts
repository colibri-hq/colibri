import { md5 } from "hash-wasm";

/**
 * Parsed author information
 */
export type ParsedAuthor = { name: string; email?: string };

/**
 * Author with Gravatar URL
 */
export type AuthorWithGravatar = ParsedAuthor & { gravatarUrl?: string };

// Memoization cache for Gravatar URLs keyed by "email:size"
const gravatarCache = new Map<string, string>();

// Memoization cache for parsed authors with Gravatar keyed by "authorString:size"
const authorCache = new Map<string, AuthorWithGravatar>();

/**
 * Parses author string in format "Name <email@address>" or just "Name"
 *
 * @example
 * parseAuthor("John Doe <john@example.com>")
 * // { name: "John Doe", email: "john@example.com" }
 *
 * parseAuthor("John Doe")
 * // { name: "John Doe" }
 */
export function parseAuthor(author: string): ParsedAuthor {
  const match = author.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1]!.trim(), email: match[2]!.trim().toLowerCase() };
  }
  return { name: author.trim() };
}

/**
 * Generates Gravatar URL from email address using MD5 hash.
 * Results are memoized to avoid redundant hash computations.
 *
 * @param email - Email address
 * @param size - Image size in pixels (default 80)
 * @param defaultImage - Default image type: 'mp', 'identicon', 'monsterid', 'wavatar', 'retro', 'robohash', 'blank'
 * @returns Gravatar URL
 *
 * @see https://docs.gravatar.com/api/avatars/images/
 */
export async function getGravatarUrl(
  email: string,
  size = 80,
  defaultImage = "identicon",
): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  const cacheKey = `${normalizedEmail}:${size}:${defaultImage}`;

  const cached = gravatarCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const hash = await md5(normalizedEmail);
  const url = `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;

  gravatarCache.set(cacheKey, url);
  return url;
}

/**
 * Parses author string and generates Gravatar URL if email is present.
 * Results are memoized to avoid redundant processing.
 *
 * @param authorString - Author in "Name <email>" or "Name" format
 * @param size - Gravatar image size in pixels
 * @returns Parsed author with optional Gravatar URL
 */
export async function getAuthorWithGravatar(
  authorString: string,
  size: number = 80,
): Promise<AuthorWithGravatar> {
  const cacheKey = `${authorString}:${size}`;

  const cached = authorCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const parsed = parseAuthor(authorString);

  let result: AuthorWithGravatar;
  if (parsed.email) {
    result = { ...parsed, gravatarUrl: await getGravatarUrl(parsed.email, size) };
  } else {
    result = parsed;
  }

  authorCache.set(cacheKey, result);
  return result;
}

/**
 * Creates a URL-safe slug from an author name.
 * Used for author archive page URLs.
 *
 * @param name - Author name
 * @returns URL-safe slug
 */
export function authorNameToSlug(name: string): string {
  return encodeURIComponent(name.toLowerCase().trim());
}

/**
 * Decodes an author slug back to a name for display.
 *
 * @param slug - URL-encoded author slug
 * @returns Decoded author name
 */
export function slugToAuthorName(slug: string): string {
  return decodeURIComponent(slug);
}
