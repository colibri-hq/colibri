import type { Selectable } from "kysely";
import { withCover } from "./work.js";
import type { Database, Schema } from "../database.js";
import type { Publisher as $Publisher } from "../schema.js";
import { lower } from "../utilities.js";

const table = "publisher" as const;

export async function listPublishers(database: Database, term?: string) {
  const query = database
    .selectFrom(table)
    .selectAll()
    .orderBy("updated_at", "desc");

  if (term) {
    return query.where("name", "like", `%${term}%`).execute();
  }

  return query.execute();
}

export function loadPublisher(database: Database, id: string) {
  return database
    .selectFrom(table)
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirstOrThrow();
}

export function loadWorksForPublisher(database: Database, id: string) {
  return withCover(
    database
      .selectFrom(table)
      .innerJoin("edition", "edition.publisher_id", "publisher.id")
      .innerJoin("work", "work.id", "edition.work_id")
      .where("publisher.id", "=", id),
  )
    .selectAll("work")
    .selectAll("edition")
    .select("work.id as id")
    .execute();
  //
  // return database
  //   .selectFrom(table)
  //   .innerJoin('edition', 'edition.publisher_id', 'publisher.id')
  //   .innerJoin('work', 'work.id', 'edition.work_id')
  //   .leftJoin('cover', 'cover.id', 'edition.cover_id')
  //   .where('publisher.id', '=', id)
  //   .selectAll('work')
  //   .selectAll('edition')
  //   .select(({ ref }) => ref('cover.blurhash').as('cover_blurhash'))
  //   .execute();
}

export function loadCreatorsForPublisher(database: Database, id: string) {
  return database
    .selectFrom(table)
    .innerJoin("edition", "edition.publisher_id", "publisher.id")
    .innerJoin("contribution", "contribution.edition_id", "edition.id")
    .innerJoin("creator", "creator.id", "contribution.creator_id")
    .where("publisher.id", "=", id)
    .selectAll("creator")
    .execute();
}

export function findPublisherByName(database: Database, name: string) {
  return database
    .selectFrom(table)
    .selectAll()
    .where((eb) => eb(lower(eb.ref("name")), "=", name.toLowerCase()))
    .executeTakeFirst();
}

type NewPublisher = {
  description?: string | undefined;
  imageId?: number | string | undefined;
  sortingKey?: string | undefined;
  userId?: string | number | undefined;
  url?: string | undefined;
  wikipediaUrl?: string | undefined;
};
export function createPublisher(
  database: Database,
  name: string,
  {
    description,
    imageId: image_id,
    sortingKey: sorting_key = name,
    userId,
    url,
    wikipediaUrl: wikipedia_url,
  }: NewPublisher,
) {
  return database
    .insertInto(table)
    .values({
      updated_by: userId ? userId.toString() : undefined,
      description,
      image_id,
      name,
      sorting_key,
      url,
      wikipedia_url,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

type UpdatedPublisher = {
  description?: string | undefined;
  imageId?: number | string | undefined;
  name?: string | undefined;
  sortingKey?: string | undefined;
  url?: string | undefined;
  wikipediaUrl?: string | undefined;
};

export function updatePublisher(
  database: Database,
  id: string,
  {
    description,
    imageId: image_id,
    name,
    sortingKey: sorting_key = name,
    url,
    wikipediaUrl: wikipedia_url,
  }: UpdatedPublisher,
) {
  return database
    .updateTable(table)
    .set({
      description,
      image_id,
      name,
      sorting_key,
      url,
      wikipedia_url,
    })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

type Table = Schema[typeof table];
export type Publisher = Selectable<$Publisher>;
