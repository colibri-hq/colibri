import { env } from "$env/dynamic/private";
import { loadBook, loadCreatorsForBook, NoResultError } from "@colibri-hq/sdk";
import { error, type RequestHandler } from "@sveltejs/kit";

/**
 * This endpoint serves the llms.txt file for a book.
 *
 * @see https://llmstxt.org
 */
export const GET = async function ({ params, locals: { database } }) {
  if (!env.LLMS_TXT_ENABLED) {
    throw error(404, {
      message: "The /llms.txt feature is not enabled on this Colibri instance.",
    });
  }

  const bookId = params.book!;
  let book;
  let creators;

  try {
    [book, creators] = await Promise.all([
      loadBook(database, bookId),
      loadCreatorsForBook(database, bookId),
    ]);
  } catch (cause) {
    if (cause instanceof NoResultError) {
      throw error(404, {
        message: "Book not found",
      });
    }

    throw error;
  }

  return new Response(
    `# title: ${book.title}
    
    > Written by ${creators.map((creator) => creator.name).join(" & ")}

    ${book.synopsis}
    
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
