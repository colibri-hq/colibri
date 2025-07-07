import type { DB } from "./schema.js";
import { jsonBuildObject } from "kysely/helpers/postgres";
import {
  type Expression,
  type RawBuilder,
  type SelectQueryBuilder,
  sql,
} from "kysely";
import type { Database } from "./database.js";

type ExtractTableAlias<DB, TE> = TE extends `${string} as ${infer TA}`
  ? TA extends keyof DB
    ? TA
    : never
  : TE extends keyof DB
    ? TE
    : never;

type PaginationData = {
  _pagination: {
    last_page: number;
    page: number;
    per_page: number;
    total: string | number | bigint;
  };
};
type PaginationSchema = {
  _pagination: PaginationData;
};

export type Paginated<T> = Omit<T, "_pagination"> & PaginationData;

export function paginate<T extends keyof DB, O>(
  database: Database,
  table: T,
  page: number = 1,
  perPage = 10,
): SelectQueryBuilder<
  DB & PaginationSchema,
  ExtractTableAlias<DB, T> | "_pagination",
  O
> {
  const limit = Math.max(1, Math.min(100, perPage));
  const offset = limit * Math.max(0, page - 1);

  // @ts-ignore
  return (
    database
      .with("_pagination", (eb) =>
        eb.selectFrom(table).select(({ fn, lit, cast }) =>
          jsonBuildObject({
            last_page: sql<number>`ceil
              (count(*) / ${cast(lit(limit), "float4")})`,
            per_page: lit(limit),
            page: lit(page),
            total: fn.countAll(),
          }).as("_pagination"),
        ),
      )
      .selectFrom([table, "_pagination"])

      // @ts-expect-error -- Kysely won't pick up the correct type for the CTE here - why?
      .select("_pagination")
      .limit(limit)
      .offset(offset)
  );
}

export function upper(expr: Expression<string>) {
  return sql<string>`upper(${expr})`;
}

export function lower(expr: Expression<string>) {
  return sql<string>`lower(${expr})`;
}

export function concat<T extends Expression<V>, V extends string>(
  ...expressions: T[]
): RawBuilder<V> {
  return sql.join(expressions, sql<string>`||`) as RawBuilder<V>;
}

export function mergeJson<A, B>(a: Expression<A>, b: Expression<B>) {
  return sql<A & B>`${a} || ${b}`;
}
