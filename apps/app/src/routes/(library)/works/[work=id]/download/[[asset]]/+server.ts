import { read } from "$lib/server/storage";
import type { RequestHandler } from "@sveltejs/kit";
import { error, redirect } from "@sveltejs/kit";
import { loadWorkWithAssets } from "@colibri-hq/sdk";

const handler = async function ({
  params,
  request,
  url,
  locals: { database, storage },
}): Promise<Response> {
  const work = await loadWorkWithAssets(database, params.work!);

  if (work.assets.length === 0) {
    throw error(404);
  }

  const assetId = params.asset;
  const asset = assetId
    ? work.assets.find((a) => a.id === assetId)
    : work.assets.at(0);

  if (!asset || !asset.storage_reference) {
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

  const data = await read(await storage, asset.storage_reference);
  return new Response(data as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": asset.mediaType as string,
      "Last-Modified": asset.updatedAt.toUTCString() as string,
    },
  });
} satisfies RequestHandler;

// noinspection JSUnusedGlobalSymbols
export const GET = handler;
