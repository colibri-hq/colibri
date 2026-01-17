import { S3Client } from "@aws-sdk/client-s3";
import type { Database } from "../database.js";
import type { Storage } from "./types.js";
import packageJson from "../../package.json" with { type: "json" };
import { getSecret, removeSecret, storeSecret } from "../resources/index.js";

const { version } = packageJson;

export async function storage(
  database: Database,
  clientOptions?: StorageOptions["clientOptions"],
): Promise<Storage> {
  const dsn = await getStorageDsn(database);
  const connection = parseStorageDsn(dsn);

  if (!connection) {
    throw new Error("Storage DSN is not invalid");
  }

  return client({ ...connection, clientOptions });
}

export async function getStorageDsn(database: Database): Promise<string> {
  const dsn = await getSecret(database, "storage.dsn");

  if (!dsn) {
    throw new Error("Storage DSN is not configured");
  }

  return dsn;
}

export async function updateStorageDsn(database: Database, dsn: string): Promise<void> {
  if (!dsn) {
    throw new Error("Storage DSN cannot be empty");
  }

  const connection = parseStorageDsn(dsn);

  if (!connection) {
    throw new Error("Storage DSN is not valid");
  }

  await database.transaction().execute(async (trx) => {
    await removeSecret(trx, "storage.dsn");
    await storeSecret(trx, "storage.dsn", dsn, "Connection String for the Storage Provider");
  });
}

function parseStorageDsn(dsn: string): StorageConnection | undefined {
  const {
    username: accessKeyId,
    password: secretAccessKey,
    origin,
    pathname,
    searchParams,
  } = new URL(dsn);

  if (!accessKeyId || !secretAccessKey) {
    return undefined;
  }

  const endpoint = origin + pathname;

  if (!endpoint || !endpoint.startsWith("http")) {
    throw new Error("Invalid storage endpoint in DSN.");
  }

  const forcePathStyle = searchParams.get("forcePathStyle") === "true";
  const defaultBucket = searchParams.get("defaultBucket") ?? undefined;
  const region = searchParams.get("region") ?? "local";

  return { accessKeyId, secretAccessKey, endpoint, forcePathStyle, defaultBucket, region };
}

export function client({
  defaultBucket = "colibri",
  accessKeyId,
  clientOptions,
  endpoint,
  forcePathStyle = true,
  region,
  secretAccessKey,
}: StorageConnection & StorageOptions): Storage {
  // @ts-ignore -- exact optional property types problem, but completely valid
  const client = new S3Client({
    ...clientOptions,
    credentials: { accessKeyId, secretAccessKey },
    customUserAgent: `colibri-sdk/${version}`,
    endpoint,
    forcePathStyle,
    region,
  });

  return { client, defaultBucket };
}

type StorageConnection = {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string | undefined;
  forcePathStyle?: boolean | undefined;
  defaultBucket?: string | undefined;
  region?: string | undefined;
};

type StorageOptions = { clientOptions?: ConstructorParameters<typeof S3Client>[0] };
