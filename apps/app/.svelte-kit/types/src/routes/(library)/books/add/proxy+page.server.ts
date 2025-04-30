// @ts-nocheck
import type { Actions } from "@sveltejs/kit";
import { fail, redirect } from "@sveltejs/kit";

export const actions = {
  default: async ({ request, url, locals, platform }: import('./$types').RequestEvent) => {
    const data = await request.formData();
    const title = data.get("title") as string;

    if (!title) {
      return fail(400, {
        title,
        message: "Missing book title",
      });
    }

    const authorId = (data.get("author") || undefined) as string | undefined;
    const authorName = data.get("authorName") as string | undefined;

    const publisherId = (data.get("publisher") || undefined) as
      | string
      | undefined;
    const publisherName = data.get("publisherName") as string | undefined;

    const publishingDate = data.get("publishingDate") as string | undefined;
    const description = data.get("description") as string | undefined;
    const language = data.get("language") as string | undefined;
    const isbn = data.get("isbn") as string | undefined;
    const uuid = data.get("uuid") as string | undefined;
    const doi = data.get("doi") as string | undefined;
    const jdcn = data.get("jdcn") as string | undefined;
    const rights = data.get("rights") as string | undefined;

    const file = data.get("file") as File;
    const coverFile = data.get("cover") as File | undefined;
    const coverHash = data.get("coverHash") as string | undefined;

    const metadata = JSON.stringify(collectMetadata(data));

    // TODO: Find and link publisher, if they exist, or create a new one
    // TODO: (Future) Search for similar books and offer to merge data instead

    let uploadPath: string | undefined = undefined;
    let book: Book & {
      author: { name: string } | null;
      publisher: { name: string } | null;
    };

    try {
      book = await prisma.$transaction(async (tx) => {
        const book = await tx.book.create({
          data: {
            title,
            description,
            language,
            isbn,
            doi,
            jdcn,
            uuid,
            rights,
            metadata,
            publishedAt: publishingDate ? new Date(publishingDate) : null,
            updatedBy: {
              connect: {
                id: locals.userId,
              },
            },
            assets: {
              create: {
                size: file.size,
                mediaType: "application/epub+zip",
              },
            },

            // Attach or create the author if they don't exist yet. This relies
            // on the author ID being undefined if there was no match at the
            // submission time.
            author: {
              connectOrCreate: {
                create: {
                  name: authorName as string,
                  updatedBy: {
                    connect: {
                      id: locals.userId,
                    },
                  },
                },
                where: {
                  id: authorId || "__none__",
                },
              },
            },

            publisher: {
              connectOrCreate: {
                create: {
                  name: publisherName as string,
                  updatedBy: {
                    connect: {
                      id: locals.userId,
                    },
                  },
                },
                where: {
                  id: publisherId || "__none__",
                },
              },
            },
          },
          include: {
            assets: true,
            author: { select: { name: true } },
            publisher: { select: { name: true } },
          },
        });

        uploadPath = resolveBookPath(book);
        const assetPath = resolveAssetPath(book, book.assets.at(0) as Asset);

        // TODO: Put file into storage (What kind? -> Maybe S3, Cloudflare R2 or
        //  		 local storage depending on SvelteKit build adapter? This will
        //  		 likely require a build plugin, but could be very cool!
        await writeFile(platform, assetPath, file.stream());

        if (coverFile) {
          const type = await resolveFileType(coverFile);
          const mimeType = type?.mime || "image/jpeg";
          const cover = await tx.cover.create({
            data: {
              size: coverFile.size,
              mediaType: mimeType,
              hash: coverHash as string,

              // TODO: Figure out a way to set the image dimensions. Probably by
              //       inspecting the image as such 🤔
              width: 0,
              height: 0,
              book: {
                connect: {
                  id: book.id,
                },
              },
            },
          });
          const coverPath = resolveCoverPath(book, cover);

          await writeFile(platform, coverPath, coverFile.stream());
        }

        return book;
      });
    } catch (error) {
      // Clean up the assets created during the transaction
      if (uploadPath) {
        await removeDirectory(platform, uploadPath as string);
      }

      throw error;
    }

    // Add book to the search index
    await indexBook(book, url);

    throw redirect(307, `/books/${book.id}`);
  },
};

function collectMetadata(
  data: FormData,
  fieldName: string = "metadata",
): Record<string, string | null> {
  return Object.fromEntries(
    Array.from(data.entries())
      .filter(([key]) => key.startsWith(fieldName))
      .map(([key, value]) => [
        key.replace(new RegExp(`^${fieldName}\\[(.+)]$`), "$1"),
        typeof value === "string" ? value : null,
      ]),
  );
}
;null as any as Actions;