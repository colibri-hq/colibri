const { makeKyselyHook } = require("kanel-kysely");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable must be set");
}

/** @type {import('kanel').Config} */
module.exports = {
  connection: {
    connectionString,
  },
  schemas: ["public", "authentication", "auth"],

  preDeleteOutputFolder: true,
  outputPath: "./src/schema",

  customTypeMap: {
    "pg_catalog.tsvector": "string",
    "pg_catalog.bpchar": "string",
    "pg_catalog.float8": "number",
  },

  enumStyle: "type",

  preRenderHooks: [makeKyselyHook()],
};
