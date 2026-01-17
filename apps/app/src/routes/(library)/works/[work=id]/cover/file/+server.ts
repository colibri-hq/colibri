import { read } from "$lib/server/storage";
import { error, redirect, type RequestHandler } from "@sveltejs/kit";

export const GET = async function ({ params, request, url, locals: { database, storage } }) {
  const edition = url.searchParams.get("edition");
  const id = params.work;

  if (typeof id === "undefined") {
    throw error(400, "Invalid request");
  }

  const cover = await database
    .selectFrom("work")
    .where("work.id", "=", id)
    .innerJoin("edition", (join) =>
      edition
        ? join.on((eb) => eb("edition.id", "=", eb.val(edition)))
        : join.onRef("edition.id", "=", "work.main_edition_id"),
    )
    .innerJoin("image", "image.id", "edition.cover_image_id")
    .selectAll("image")
    .executeTakeFirst();

  if (!cover) {
    throw error(404, "Cover not found");
  }

  const hash = cover.checksum.toString("hex");

  if (
    request.headers.has("if-none-match") &&
    request.headers.get("if-none-match") === `"${hash}"`
  ) {
    throw redirect(304, url.toString());
  }

  const coverTimestamp = cover.updated_at ?? cover.created_at;

  if (request.headers.has("if-modified-since")) {
    const timestamp = new Date(request.headers.get("if-modified-since") as string);

    if (coverTimestamp <= timestamp) {
      throw redirect(304, url.toString());
    }
  }

  // Parse the s3:// URI to extract just the key path
  // e.g., s3://colibri/images/abc/file.jpg -> images/abc/file.jpg
  const storageUrl = new URL(cover.storage_reference);
  const key = storageUrl.pathname.slice(1); // Remove leading /
  const body = await read(await storage, key);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": cover.media_type,
      "Last-Modified": coverTimestamp.toUTCString(),
      ETag: `"${hash}"`,
    },
  });
} satisfies RequestHandler;
