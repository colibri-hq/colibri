import { error, redirect, type RequestHandler } from "@sveltejs/kit";

const handler: RequestHandler = async function ({
  params,
  locals: { database },
}) {
  const id = params.creator;

  if (typeof id !== "string") {
    return error(400, "Invalid creator ID");
  }

  const { image } = await database
    .selectFrom("creator")
    .select("image")
    .where("id", "=", id)
    .executeTakeFirstOrThrow();

  if (image === null) {
    return error(404, "No picture available");
  }

  throw redirect(307, image);
};

export const GET = handler;
