import { searchBook } from "$lib/metadata/open-library";
import type { WebWorker, WorkerMessage } from "$lib/workers/workers";
import type { WorkWithMainEdition } from "@colibri-hq/sdk/types";
import type { Creator } from "@colibri-hq/sdk/schema";

// Input message type
type BookMetadataInput = WorkerMessage<
  "search",
  Pick<WorkWithMainEdition, "title" | "isbn_10" | "isbn_13" | "language"> & {
    creators: Pick<Creator, "name">[];
  }
>;

// Output message type
type BookMetadataOutput = WorkerMessage<
  "search",
  {
    amount: number;
    books: Array<Record<string, unknown>>;
  }
>;

export type BookMetadataWorker = WebWorker<
  BookMetadataInput,
  BookMetadataOutput
>;

console.log("Book Metadata Worker started");

onmessage = async function ({
  data: { payload },
}: MessageEvent<BookMetadataInput>) {
  console.log("Book Metadata Worker received message", { payload });

  const result = await searchBook({
    title: payload.title,
    isbn: payload.isbn_13 ?? payload.isbn_10 ?? undefined,
    language: payload.language ?? undefined,
    authors: payload.creators.map((creator) => creator.name),
  });

  postMessage({ type: "search", payload: result });
};
