import { stream } from "$lib/server/storage";
import { error, redirect, type RequestHandler } from "@sveltejs/kit";

export const GET = async function ({
  params,
  request,
  url,
  locals: { database, storage },
}) {
  const edition = url.searchParams.get("edition");
  const id = params.book;

  if (typeof id === "undefined") {
    throw error(400, "Invalid request");
  }

  const cover = await database
    .selectFrom("book")
    .where("book.id", "=", id)
    .innerJoin("edition", (join) =>
      edition
        ? join.on((eb) => eb("edition.id", "=", eb.val(edition)))
        : join.onRef("edition.id", "=", "book.main_edition_id"),
    )
    .innerJoin("cover", "cover.id", "edition.cover_id")
    .selectAll("cover")
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
    const timestamp = new Date(
      request.headers.get("if-modified-since") as string,
    );

    if (coverTimestamp <= timestamp) {
      throw redirect(304, url.toString());
    }
  }

  const body = await stream(await storage, cover.storage_reference);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": cover.media_type,
      "Last-Modified": coverTimestamp.toUTCString(),
      ETag: `"${hash}"`,
    },
  });
} satisfies RequestHandler;
