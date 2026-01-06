import { error, redirect, type RequestHandler } from "@sveltejs/kit";

const handler: RequestHandler = async function ({
  params,
  locals: { database },
}) {
  const id = params.publisher;

  if (typeof id !== "string") {
    return error(400, "Invalid publisher ID");
  }

  const result = await database
    .selectFrom("publisher")
    .leftJoin("image", "image.id", "publisher.image_id")
    .select(["publisher.url", "image.path as image_path"])
    .where("publisher.id", "=", id)
    .executeTakeFirstOrThrow();

  // Try image path first, then fall back to URL
  const imageUrl = result.image_path || result.url;

  if (!imageUrl) {
    return error(404, "No picture available");
  }

  throw redirect(307, imageUrl);
};

export const GET = handler;
