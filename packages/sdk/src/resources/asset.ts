import type { Database, Schema } from "../database.js";
import {
  removeObjects,
  storage as createStorage,
  writeFile,
} from "../storage/index.js";
import { subtle } from "node:crypto";
import type { JsonObject } from "../schema.js";
import { mergeJson } from "../utilities.js";
import { fileTypeFromBlob } from "file-type";
import { slugify } from "@colibri-hq/shared";

const table = "asset" as const;

type NewAsset = {
  metadata?: JsonObject;
  userId?: number | string;
};

export async function createAsset(
  database: Database,
  file: File,
  editionId: number | string,
  { userId, metadata = {} }: NewAsset,
) {
  const rawContents = await file.bytes();
  const checksum = Buffer.from(await subtle.digest("SHA-256", rawContents));
  const { mime = "application/octet-stream", ext = "blob" } =
    (await fileTypeFromBlob(file)) ?? {};

  const name = slugify(file.name.split(".").slice(0, -1).join("."));
  file = new File(
    [file],
    `assets/${checksum.toString("base64url")}/${name}.${ext}`,
    { type: file.type ?? mime, lastModified: file.lastModified },
  );

  const storage = await createStorage(database);
  const fileUrl = await writeFile(storage, file);

  try {
    return database
      .insertInto(table)
      .values({
        checksum,
        created_by: userId?.toString(),
        edition_id: editionId.toString(),
        filename: file.name,
        media_type: file.type,
        metadata,
        size: file.size,
        storage_reference: fileUrl.toString(),
      })
      .onConflict((oc) =>
        oc.column("checksum").doUpdateSet((eb) => ({
          metadata: mergeJson(
            eb.ref("asset.metadata"),
            eb.ref("excluded.metadata"),
          ),
          storage_reference: eb.ref("excluded.storage_reference"),
          updated_by: eb.ref("excluded.created_by"),
          updated_at: eb.fn("now"),
        })),
      )
      .returningAll()
      .executeTakeFirstOrThrow();
  } catch (cause) {
    await removeObjects(storage, file.name);

    throw new Error(`Failed to create asset: ${cause}`, { cause });
  }
}

type Table = Schema[typeof table];
