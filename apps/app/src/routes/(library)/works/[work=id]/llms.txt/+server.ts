import { env } from "$env/dynamic/private";
import { loadWork, loadCreatorsForWork, NoResultError } from "@colibri-hq/sdk";
import { error, type RequestHandler } from "@sveltejs/kit";

/**
 * This endpoint serves the llms.txt file for a book.
 *
 * @see https://llmstxt.org
 */
export const GET = async function ({ params, locals: { database } }) {
  if (!env.LLMS_TXT_ENABLED) {
    throw error(404, { message: "The /llms.txt feature is not enabled on this Colibri instance." });
  }

  const workId = params.work!;
  let work;
  let creators;

  try {
    [work, creators] = await Promise.all([
      loadWork(database, workId),
      loadCreatorsForWork(database, workId),
    ]);
  } catch (cause) {
    if (cause instanceof NoResultError) {
      throw error(404, { message: "Book not found" });
    }

    throw error;
  }

  return new Response(
    `# title: ${work.title}
    
    > Written by ${creators.map((creator) => creator.name).join(" & ")}

    ${work.synopsis}
    
    ## Editions
    // TODO
    
    ## Creators
    // TODO
    
    ## Contributors
    // TODO
    
    ## Reviews
    // TODO
    
    ## Similar books
    // TODO
    
    ## Tags
    // TODO
    
    ## Links
    // TODO
    
    ## Comments
    // TODO
    `,
    { status: 200 },
  );
} satisfies RequestHandler;
