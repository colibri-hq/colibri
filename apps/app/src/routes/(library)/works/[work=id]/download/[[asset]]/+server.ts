import { read } from "$lib/server/storage";
import type { RequestHandler } from "@sveltejs/kit";
import { error, redirect } from "@sveltejs/kit";
import { loadWork } from "@colibri-hq/sdk";

const handler = async function ({
  params,
  request,
  url,
  locals: { database, storage },
}): Promise<Response> {
  const work = await loadWork(database, params.work!);

  if (work.assets.length === 0) {
    throw error(404);
  }

  const asset = params.asset
    ? work.assets.find((asset) => asset.id === params.asset)
    : work.assets.at(0);

  if (!asset) {
    return error(404, "Failed to locate asset");
  }

  if (request.headers.has("if-modified-since")) {
    const timestamp = new Date(
      request.headers.get("if-modified-since") as string,
    );

    if (asset.updatedAt <= timestamp) {
      throw redirect(304, url.toString());
    }
  }

  return new Response(await read(await storage, asset.storage_reference), {
    status: 200,
    headers: {
      "Content-Type": asset.mediaType as string,
      "Last-Modified": asset.updatedAt.toUTCString() as string,
    },
  });
} satisfies RequestHandler;

// noinspection JSUnusedGlobalSymbols
export const GET = handler;
