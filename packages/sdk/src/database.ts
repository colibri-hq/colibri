import { Kysely, PostgresDialect, sql } from "kysely";

// Re-export sql helper for use in raw queries
export { sql };
import { Buffer } from "node:buffer";
import { Pool } from "pg";
import type { DB } from "./schema.js";

export type Schema = DB;
export type Database = Kysely<DB>;

type ClientOptions = {
  certificate?: string;
  debug?: boolean;
  log?: (
    channel: string,
    level: string,
    message: string | Error,
    ...args: unknown[]
  ) => unknown;
};

/**
 * Initialize a new Kysely instance with a Postgres dialect.
 *
 * @param {URL|string} connectionString The connection string to the database.
 * @param {string|undefined} [certificate]
 * @param {boolean|undefined} [debug]
 * @param {(channel: string, level: string, message: string|Error) => any|undefined} [log]
 */
export function initialize(
  connectionString: URL | string,
  { certificate, debug, log }: ClientOptions = {},
): Database {
  const dialect = new PostgresDialect({
    pool: new Pool({
      application_name: "Colibri",
      ssl: certificate
        ? {
            rejectUnauthorized: false,
            ca: Buffer.from(certificate, "base64"),
          }
        : undefined,
      connectionString: connectionString.toString(),
      log:
        debug && log
          ? (message, error, ...args) =>
              error instanceof Error
                ? log("postgres", "error", error, ...args)
                : log("postgres", "debug", message, ...args)
          : undefined,
    }),
  });

  return new Kysely<DB>({
    log: (event) => {
      const { level } = event;

      if (debug && level === "query") {
        const {
          query: { sql, parameters },
          queryDurationMillis,
        } = event;
        const query = sql.replaceAll(/\$\d+/g, (match) => {
          const parameter = parameters[parseInt(match.slice(1)) - 1];

          if (parameter instanceof Buffer) {
            return `<Buffer len="${parameter.length}">`;
          }
          if (typeof parameter === "bigint") {
            return parameter.toString();
          }
          return JSON.stringify(parameter);
        });
        const duration = queryDurationMillis.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });

        log?.(
          "kysely:query",
          "debug",
          `${query} \x1b[2m(${duration}ms)\x1b[0m`,
        );

        return;
      }

      if (level === "error") {
        const { error, queryDurationMillis, query } = event;

        log?.(
          "kysely",
          "error",
          `${error}${error instanceof Error ? "\n" + error.stack : ""}`,
          {
            query,
            duration: queryDurationMillis,
          },
        );
      }
    },
    dialect,
  });
}
