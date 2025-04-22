import { searchBook } from '$lib/metadata/open-library';
import type { WebWorker, WorkerMessage } from '$lib/workers/workers';
import type {
  BookWithCreators,
  BookWithMainEdition,
  Creator,
} from '@colibri-hq/sdk';

export type BookMetadataWorker = WebWorker<
  Pick<BookWithMainEdition, 'title' | 'isbn_10' | 'isbn_13' | 'language'> & {
    creators: Pick<Creator, 'name'>[];
  }
>;

console.log('Book Metadata Worker started');

onmessage = async function ({
  data: { payload },
}: MessageEvent<WorkerMessage<BookWithMainEdition<BookWithCreators>>>) {
  console.log('Book Metadata Worker received message', { payload });

  const result = await searchBook({
    title: payload.title,
    isbn: payload.isbn_13 ?? payload.isbn_10 ?? undefined,
    language: payload.language ?? undefined,
    authors: payload.creators.map((creator) => creator.name),
  });

  postMessage({ result });
};
