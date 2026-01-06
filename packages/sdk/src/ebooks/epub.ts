import { Epub } from "./epub/legacy.js";
import type { Identifier, Metadata } from "./metadata.js";
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
  await book.load();
  const cover = await book.getCover();

  const {
    contributors,
    description: synopsis,
    identifier,
    language,
    modified: dateModified,
    published: datePublished,
    rights,
    series,
    sortAs,
    subject = [],
    title,
    publisher,
    ...properties
  } = await book.metadata;

  return {
    title: wrapArray(title).shift(),
    dateModified,
    synopsis,
    identifiers: loadIdentifiers({ identifier }),
    contributors: loadContributors({ contributors, publisher }),
    legalInformation: rights ?? undefined,
    tags: loadSubjects(subject),
    language: wrapArray(language).shift(),
    properties,
    datePublished,
    cover,
    series,
  } as Metadata;
}

function loadIdentifiers({
  identifier = [],
}: Pick<Awaited<Epub["metadata"]>, "identifier">) {
  return wrapArray(identifier)
    .filter((value) => !!value)
    .map((value) => {
      if (!value.includes(":")) {
        if (value.length === 10 || value.length === 13) {
          return {
            type: "isbn" as const,
            value,
          };
        }

        return {
          type: "other" as const,
          value,
        };
      }

      if (value.startsWith("urn:")) {
        value = value.slice(4);
      }

      const [type, ...rest] = value.split(":");
      const identifier = rest.join(":");

      return {
        type: type.toLowerCase() as Identifier["type"],
        value: identifier,
      };
    });
}

function loadContributors({
  contributors = [],
  publisher,
}: Pick<Awaited<Epub["metadata"]>, "contributors" | "publisher">) {
  return [...contributors, publisher]
    .filter((contributor) => contributor !== undefined)
    .filter(({ name }) => !name.endsWith("[https://calibre-ebook.com]"))
    .map(({ name, roles, sortAs }) => ({
      name,
      roles: wrapArray(roles),
      sortingKey: sortAs,
    }));
}

/**
 * Extract and normalize subjects from EPUB metadata
 * Handles compound subjects like "Fiction / Fantasy / Epic"
 */
function loadSubjects(
  subjects: Array<{
    name: string;
    term?: string | undefined;
    authority?: string | undefined;
  }>,
): string[] {
  const allSubjects: string[] = [];

  for (const subject of subjects) {
    const subjectText = subject.term ?? subject.name;

    // Split on " / " for BISAC-style compound subjects
    if (subjectText.includes(" / ")) {
      const parts = subjectText
        .split(" / ")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      allSubjects.push(...parts);
    } else {
      allSubjects.push(subjectText);
    }
  }

  // Deduplicate and filter empty strings
  return [...new Set(allSubjects)].filter((s) => s.length > 0);
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

    if (!file || !("getData" in file)) {
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
