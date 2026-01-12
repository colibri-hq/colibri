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

/** ZIP file magic number (PK\x03\x04) */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const;

export async function isZipFile(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return ZIP_MAGIC.every((byte, i) => header[i] === byte);
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
    .map((rawValue) => {
      // Handle plain identifiers without scheme prefix
      if (!rawValue.includes(":")) {
        if (rawValue.length === 10 || rawValue.length === 13) {
          return { type: "isbn" as const, value: rawValue };
        }
        return { type: "other" as const, value: rawValue };
      }

      // Strip optional "urn:" prefix
      const normalizedValue = rawValue.startsWith("urn:")
        ? rawValue.slice(4)
        : rawValue;

      const [type, ...rest] = normalizedValue.split(":");
      return {
        type: type.toLowerCase() as Identifier["type"],
        value: rest.join(":"),
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
 * Extract and normalize subjects from EPUB metadata.
 * Handles compound subjects like "Fiction / Fantasy / Epic"
 */
function loadSubjects(
  subjects: Array<{
    name: string;
    term?: string | undefined;
    authority?: string | undefined;
  }>,
): string[] {
  const allSubjects = subjects.flatMap((subject) => {
    const subjectText = subject.term ?? subject.name;

    // Split on " / " for BISAC-style compound subjects
    return subjectText.includes(" / ")
      ? subjectText.split(" / ").map((s) => s.trim())
      : [subjectText];
  });

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
