import type { Database } from '../database';

export function loadLanguages(database: Database) {
  return database.selectFrom('language').execute();
}

export function searchLanguages(database: Database, query: string) {
  return database
    .selectFrom('language')
    .select(['iso_639_3', 'name', 'type'])
    .where((eb) =>
      eb.or([
        eb('name', 'ilike', `${query}%`),
        eb('iso_639_3', 'ilike', `${query}%`),
        eb('iso_639_1', 'ilike', `${query}%`),
      ]),
    )
    .limit(10)
    .execute();
}
