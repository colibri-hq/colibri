import { searchBook } from "$lib/metadata/open-library";
import type { WebWorker, WorkerMessage } from "$lib/workers/workers";
import type { WorkWithCreators, WorkWithMainEdition } from "@colibri-hq/sdk";
import type { Creator } from "@colibri-hq/sdk/schema";

export type BookMetadataWorker = WebWorker<
  Pick<WorkWithMainEdition, "title" | "isbn_10" | "isbn_13" | "language"> & {
    creators: Pick<Creator, "name">[];
  }
>;

console.log("Book Metadata Worker started");

onmessage = async function ({
  data: { payload },
}: MessageEvent<WorkerMessage<WorkWithMainEdition<WorkWithCreators>>>) {
  console.log("Book Metadata Worker received message", { payload });

  const result = await searchBook({
    title: payload.title,
    isbn: payload.isbn_13 ?? payload.isbn_10 ?? undefined,
    language: payload.language ?? undefined,
    authors: payload.creators.map((creator) => creator.name),
  });

  postMessage({ result });
};
