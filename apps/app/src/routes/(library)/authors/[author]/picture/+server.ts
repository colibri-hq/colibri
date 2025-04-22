import { error, redirect, type RequestHandler } from '@sveltejs/kit';

const handler: RequestHandler = async function ({
  params,
  locals: { database },
}): Promise<Response> {
  const id = params.author;

  if (typeof id !== 'string') {
    return error(400, 'Invalid creator ID');
  }

  const creator = await database
    .selectFrom('creator')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirstOrThrow();

  if (creator.image === null) {
    return error(404, 'No picture available');
  }

  throw redirect(307, creator.image);
};

export const GET = handler;
