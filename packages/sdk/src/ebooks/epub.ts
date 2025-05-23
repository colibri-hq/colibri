import { Epub } from "./epub/index.js";
import type { Metadata } from "./metadata.js";
import { wrapArray } from "@colibri-hq/shared";
import {
  BlobReader,
  BlobWriter,
  TextWriter,
  Writer,
  ZipReader,
} from "@zip.js/zip.js";

export async function isZipFile(file: File): Promise<boolean> {
  const slices = new Uint8Array(await file.slice(0, 4).arrayBuffer());

  return (
    slices[0] === 0x50 &&
    slices[1] === 0x4b &&
    slices[2] === 0x03 &&
    slices[3] === 0x04
  );
}

export async function loadEpubMetadata(
  file: File,
  signal?: AbortSignal,
): Promise<Metadata> {
  const book = await loadEpub(file, signal);
  await book.initialize();
  const metadata = await book.metadata;
  const cover = await book.getCover();

  const title = wrapArray(metadata.title).shift();
  const contributors = (metadata.contributors ?? []).map(
    ({ name, roles, sortAs }) => ({
      name,
      roles,
      sortingKey: sortAs,
    }),
  );
  const rights = metadata.rights ?? "";
  const language = wrapArray(metadata.language).shift();

  return {
    title,
    contributors,
    legalInformation: rights,
    language,
    ...metadata,
    cover,
  } as Metadata;
}

export async function loadEpub(
  file: File,
  signal?: AbortSignal,
): Promise<Epub> {
  const options = signal ? { signal } : {};
  const reader = new ZipReader(new BlobReader(file), options);
  const entries = await reader.getEntries();

  function resolveFile(href: string) {
    return entries.find(({ filename }) => filename === href);
  }

  async function readFile<T>(href: string, sink: Writer<T>) {
    const file = resolveFile(href);

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
