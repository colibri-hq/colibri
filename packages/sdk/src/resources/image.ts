import type { Database, Schema } from "../database.js";
import type { Selectable } from "kysely";
import type { Image as $Image, JsonObject } from "../schema.js";
import { Buffer } from "node:buffer";
import { fileTypeFromBlob } from "file-type";
import { subtle } from "node:crypto";
import {
  removeObjects,
  storage as createStorage,
  writeFile,
} from "../storage/index.js";
import { mergeJson } from "../utilities.js";
import { slugify } from "@colibri-hq/shared";

const table = "image" as const;

type NewImage = {
  width: number;
  height: number;
  blurhash: string;
  metadata?: JsonObject;
  description?: string;
  userId?: number | string;
};

export async function createImage(
  database: Database,
  file: File,
  { width, height, blurhash, metadata = {}, description, userId }: NewImage,
) {
  const rawContents = await file.bytes();
  const checksum = Buffer.from(await subtle.digest("SHA-256", rawContents));
  const { mime = "application/octet-stream", ext = "blob" } =
    (await fileTypeFromBlob(file)) ?? {};

  const name = slugify(file.name.split(".").slice(0, -1).join("."));
  file = new File(
    [file],
    `images/${checksum.toString("base64url")}/${name}.${ext}`,
    { type: file.type ?? mime, lastModified: file.lastModified },
  );

  const storage = await createStorage(database);
  const fileUrl = await writeFile(storage, file, {
    blurhash,
  });

  try {
    return database
      .insertInto(table)
      .values({
        blurhash,
        checksum,
        created_by: userId?.toString(),
        description,
        filename: file.name,
        height,
        media_type: file.type,
        metadata,
        size: file.size,
        storage_reference: fileUrl.toString(),
        width,
      })
      .returningAll()
      .onConflict((oc) =>
        oc.column("checksum").doUpdateSet((eb) => ({
          metadata: mergeJson(
            eb.ref("image.metadata"),
            eb.ref("excluded.metadata"),
          ),
          storage_reference: eb.ref("excluded.storage_reference"),
          updated_by: eb.ref("excluded.created_by"),
          updated_at: eb.fn("now"),
        })),
      )
      .executeTakeFirstOrThrow();
  } catch (cause) {
    await removeObjects(storage, file.name);

    throw new Error(`Failed to create image: ${cause}`, { cause });
  }
}

export function findImageByChecksum(
  database: Database,
  checksum: Uint8Array<ArrayBufferLike> | Buffer,
): Promise<Image | undefined> {
  const buffer = Buffer.isBuffer(checksum) ? checksum : Buffer.from(checksum);

  return database
    .selectFrom(table)
    .where("checksum", "=", buffer)
    .selectAll()
    .executeTakeFirst();
}

type _Table = Schema[typeof table];
export type Image = Selectable<$Image>;
