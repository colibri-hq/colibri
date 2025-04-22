import type { DB } from './schema';
import { jsonBuildObject } from 'kysely/helpers/postgres';
import { sql } from 'kysely';
import type { Database } from './database';

export function paginate<T extends keyof DB>(
  database: Database,
  table: T,
  page: number = 1,
  perPage = 10,
) {
  const limit = Math.max(1, Math.min(100, perPage));
  const offset = limit * Math.max(0, page - 1);

  return (
    database
      .with('_pagination', (eb) =>
        eb.selectFrom(table).select(({ fn, lit, cast }) =>
          jsonBuildObject({
            last_page: sql<number>`ceil
                (count(*) / ${cast(lit(limit), 'float4')})`,
            per_page: lit(limit),
            page: lit(page),
            total: fn.countAll(),
          }).as('_pagination'),
        ),
      )
      .selectFrom([table, '_pagination'])

      // @ts-expect-error -- Kysely won't pick up the correct type for the CTE here - why?
      .select('_pagination')
      .limit(limit)
      .offset(offset)
  );
}
