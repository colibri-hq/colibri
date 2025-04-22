import { Epub } from '$lib/parsing/epub/index';
import type { Metadata } from '$lib/parsing/index';
import { wrapArray } from '@colibri-hq/shared';
import {
  BlobReader,
  BlobWriter,
  TextWriter,
  Writer,
  ZipReader,
} from '@zip.js/zip.js';

export async function isZipFile(file: File) {
  const slices = new Uint8Array(await file.slice(0, 4).arrayBuffer());

  return (
    slices[0] === 0x50 &&
    slices[1] === 0x4b &&
    slices[2] === 0x03 &&
    slices[3] === 0x04
  );
}

export async function getMetadata(file: File, signal?: AbortSignal) {
  const book = await load(file, signal);
  await book.initialize();
  const metadata = await book.metadata;
  const cover = await book.getCover();

  const title = wrapArray(metadata.title).shift() ?? 'Untitled Book';
  const contributors = (metadata.contributors ?? []).map(
    ({ name, roles, sortAs }) => ({
      name,
      roles,
      sortingKey: sortAs,
    }),
  );
  const rights = metadata.rights ?? '';

  return {
    title,
    contributors,
    legalInformation: rights,
    language: wrapArray(metadata.language).shift(),
    ...metadata,
    cover,
  } as Metadata;
}

async function load(file: File, signal?: AbortSignal) {
  const options = signal ? { signal } : {};
  const reader = new ZipReader(new BlobReader(file), options);
  const entries = await reader.getEntries();

  function resolveFile(href: string) {
    return entries.find(({ filename }) => filename === href);
  }

  async function readFile<T>(href: string, sink: Writer<T>) {
    const file = resolveFile(href);
    console.log(`Reading file at ${href}`, { file });

    if (!file || !file.getData) {
      throw new Error(`File not found: ${href}`);
    }

    return await file.getData(sink, options);
  }

  return new Epub(
    (href) => readFile(href, new BlobWriter() as Writer<Blob>),
    (href) => readFile(href, new TextWriter()),
    (href) => resolveFile(href)?.uncompressedSize ?? 0,
  );
}
