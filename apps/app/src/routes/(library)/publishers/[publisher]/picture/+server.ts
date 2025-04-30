import type { RequestHandler } from "@sveltejs/kit";
import { error, redirect } from "@sveltejs/kit";

const handler: RequestHandler = async function ({ params }): Promise<Response> {
  const publisher = await prisma.publisher.findFirstOrThrow({
    where: { id: params.publisher },
    select: { logoUrl: true },
  });

  if (publisher.logoUrl === null) {
    throw error(404);
  }

  throw redirect(307, publisher.logoUrl);
};

// noinspection JSUnusedGlobalSymbols
export const GET = handler;
