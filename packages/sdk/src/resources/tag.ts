import type { Selectable } from "kysely";
import type { Database, Schema } from "../database.js";
import type { Tag as $Tag } from "../schema.js";
import { lower } from "../utilities.js";

const table = "tag" as const;

/**
 * Load all tags with pagination
 */
export function loadTags(database: Database, page?: number, perPage: number = 100) {
  let query = database.selectFrom(table).selectAll().orderBy("value", "asc");

  if (page !== undefined && page > 0) {
    query = query.limit(perPage).offset((page - 1) * perPage);
  }

  return query.execute();
}

/**
 * Load a single tag by ID
 */
export function loadTagById(database: Database, id: string) {
  return database.selectFrom(table).where("id", "=", id).selectAll().executeTakeFirstOrThrow();
}

/**
 * Load all works tagged with a specific tag
 */
export function loadWorksForTag(database: Database, tagId: string) {
  return database
    .selectFrom("work_tag")
    .innerJoin("work", "work_tag.work_id", "work.id")
    .leftJoin("edition", "work.main_edition_id", "edition.id")
    .leftJoin("image", "edition.cover_image_id", "image.id")
    .selectAll("work")
    .select("edition.title as edition_title")
    .select("image.blurhash as cover_blurhash")
    .where("work_tag.tag_id", "=", tagId)
    .execute();
}

/**
 * Load all tags for a specific work
 */
export function loadTagsForWork(database: Database, workId: string) {
  return database
    .selectFrom("work_tag")
    .innerJoin("tag", "work_tag.tag_id", "tag.id")
    .selectAll("tag")
    .where("work_tag.work_id", "=", workId)
    .orderBy("tag.value", "asc")
    .execute();
}

/**
 * Normalize a tag value (lowercase, trim)
 */
export function normalizeTag(value: string): string {
  return value.toLowerCase().trim();
}

/**
 * Create a new tag
 */
type NewTag = {
  color?: string | undefined;
  emoji?: string | undefined;
  userId?: string | undefined;
};

export function createTag(
  database: Database,
  value: string,
  { color, emoji, userId }: NewTag = {},
) {
  const normalized = normalizeTag(value);

  return database
    .insertInto(table)
    .values({ value: normalized, color, emoji, created_by: userId ? userId.toString() : undefined })
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Update a tag
 */
type UpdatedTag = {
  value?: string | undefined;
  color?: string | undefined;
  emoji?: string | undefined;
};

export function updateTag(database: Database, id: string, { value, color, emoji }: UpdatedTag) {
  return database
    .updateTable(table)
    .set({ value: value ? normalizeTag(value) : undefined, color, emoji })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Find tag by exact value (case-insensitive, normalized)
 */
export function findTagByValue(database: Database, value: string) {
  const normalized = normalizeTag(value);

  return database
    .selectFrom(table)
    .where((eb) => eb(lower(eb.ref("value")), "=", normalized))
    .selectAll()
    .executeTakeFirst();
}

/**
 * Find or create a tag by value
 * Uses normalized matching
 */
export async function findOrCreateTag(database: Database, value: string, options: NewTag = {}) {
  const existing = await findTagByValue(database, value);
  if (existing) {
    return existing;
  }

  return await createTag(database, value, options);
}

/**
 * Find or create multiple tags by value
 * Efficiently handles batch tag creation with deduplication
 *
 * @param database - Database connection
 * @param values - Array of tag values to find or create
 * @param options - Tag creation options (applied to all new tags)
 * @returns Array of tag records in the same order as input values
 */
export async function findOrCreateTags(
  database: Database,
  values: string[],
  options: NewTag = {},
): Promise<Tag[]> {
  // Normalize and deduplicate input values
  const normalized = values.map((v) => normalizeTag(v));
  const unique = [...new Set(normalized)];

  if (unique.length === 0) {
    return [];
  }

  // Find all existing tags in a single query
  const existing = await database
    .selectFrom(table)
    .selectAll()
    .where("value", "in", unique)
    .execute();

  const existingMap = new Map(existing.map((tag) => [tag.value, tag]));

  // Identify which tags need to be created
  const toCreate = unique.filter((value) => !existingMap.has(value));

  // Create missing tags
  if (toCreate.length > 0) {
    const created = await database
      .insertInto(table)
      .values(
        toCreate.map((value) => ({
          value,
          color: options.color,
          emoji: options.emoji,
          created_by: options.userId ? options.userId.toString() : undefined,
        })),
      )
      .returningAll()
      .execute();

    // Add newly created tags to the map
    for (const tag of created) {
      existingMap.set(tag.value, tag);
    }
  }

  // Return tags in the original order (deduplicated)
  return unique.map((value) => existingMap.get(value)!);
}

/**
 * Add a tag to a work
 */
export function addTagToWork(database: Database, workId: string, tagId: string) {
  return database
    .insertInto("work_tag")
    .values({ work_id: workId, tag_id: tagId })
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Add multiple tags to a work in a single query
 * Useful for bulk operations during ingestion
 *
 * @param database - Database connection
 * @param workId - Work ID to tag
 * @param tagIds - Array of tag IDs to add
 */
export async function addTagsToWork(database: Database, workId: string, tagIds: string[]) {
  if (tagIds.length === 0) {
    return [];
  }

  return database
    .insertInto("work_tag")
    .values(tagIds.map((tagId) => ({ work_id: workId, tag_id: tagId })))
    .returningAll()
    .execute();
}

/**
 * Remove a tag from a work
 */
export function removeTagFromWork(database: Database, workId: string, tagId: string) {
  return database
    .deleteFrom("work_tag")
    .where("work_id", "=", workId)
    .where("tag_id", "=", tagId)
    .execute();
}

/**
 * Delete a tag
 * This will cascade delete all work_tag, collection_tag, and series_tag entries
 */
export function deleteTag(database: Database, id: string) {
  return database.deleteFrom(table).where("id", "=", id).execute();
}

type _Table = Schema[typeof table];
export type Tag = Selectable<$Tag>;
