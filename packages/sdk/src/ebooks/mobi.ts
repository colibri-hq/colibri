import type { Metadata } from "./metadata.js";
import { parse } from "@colibri-hq/mobi";
import { fileTypeFromBuffer } from "file-type";
import { wrapArray } from "@colibri-hq/shared";

export async function isMobiFile(file: File): Promise<boolean> {
  const buffer = await file.slice(60, 68).arrayBuffer();
  const fingerprint = new TextDecoder().decode(buffer);

  return fingerprint === "BOOKMOBI";
}

export async function loadMobiMetadata(
  file: File,
  _signal?: AbortSignal,
): Promise<Metadata> {
  const metadata = await parse(file);
  const {
    title,
    titleFileAs,
    synopsis,
    publishingDate: datePublished,
    pdbHeader: { creationTime: dateCreated, modificationTime: dateModified },
    lastUpdateTime: dateUpdated,
    language,
    locale,
    rights: legalInformation,
    pageProgressionDirection: pageProgression = "ltr",
    ...properties
  } = metadata;
  delete (properties as Partial<typeof properties>).coverImage;

  return {
    contributors: loadContributors(metadata),
    cover: await loadCover(metadata),
    dateCreated,
    dateModified: dateUpdated ?? dateModified,
    datePublished,
    identifiers: loadIdentifiers(metadata),
    language: locale?.tag ?? language,
    legalInformation,
    pageProgression,
    properties: {
      pdbHeader: metadata.pdbHeader,
      ...properties,
    },
    sortingKey: titleFileAs ?? title,
    synopsis,
    tags: loadTags(metadata),
    title,
  };
}

async function loadCover({
  coverImage,
}: Pick<Awaited<ReturnType<typeof parse>>, "coverImage">) {
  if (!coverImage) {
    return undefined;
  }

  const type = (await fileTypeFromBuffer(coverImage))?.mime ?? "image/png";

  return new Blob([coverImage], { type });
}

function loadContributors({
  creator,
  creatorFileAs,
  contributor,
  publisher,
  publisherFileAs,
}: Pick<
  Awaited<ReturnType<typeof parse>>,
  "creator" | "publisher" | "creatorFileAs" | "publisherFileAs" | "contributor"
>) {
  const contributors: Metadata["contributors"] = [];

  if (creator) {
    for (const name of wrapArray(creator)) {
      contributors.push({
        name,
        sortingKey: creatorFileAs ?? name,
        roles: ["aut"],
      });
    }
  }

  if (publisher) {
    contributors.push({
      name: publisher,
      sortingKey: publisherFileAs ?? publisher,
      roles: ["bkp"],
    });
  }

  if (contributor && !contributor.includes("[https://calibre-ebook.com]")) {
    for (const name of wrapArray(contributor)) {
      contributors.push({
        name,
        sortingKey: name,
        roles: ["ctb"],
      });
    }
  }

  return contributors;
}

function loadTags(
  {
    subject,
  }: Pick<Awaited<ReturnType<typeof parse>>, "subject" | "subjectCode">,
  separator = ";",
): string[] {
  if (!subject) {
    return [];
  }

  if (Array.isArray(subject)) {
    return subject;
  }

  return subject
    .split(separator)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function loadIdentifiers({
  asin,
  uuid,
  isbn,
  source,
}: Pick<
  Awaited<ReturnType<typeof parse>>,
  "asin" | "uuid" | "isbn" | "source"
>): Metadata["identifiers"] {
  const identifiers: Metadata["identifiers"] = [];

  if (isbn) {
    identifiers.push({ type: "isbn", value: isbn });
  }

  if (asin) {
    identifiers.push({ type: "asin", value: asin });
  }

  if (uuid) {
    identifiers.push({ type: "uuid", value: uuid });
  }

  if (source) {
    if (source.startsWith("calibre:")) {
      identifiers.push({ type: "calibre", value: source.slice(8) });
    } else {
      identifiers.push({ type: "uri", value: source });
    }
  }

  return identifiers;
}

export async function loadMobi(_file: File): Promise<unknown> {
  // TODO: Implement loading of mobi files
  throw new Error("Mobi loading not implemented");
}
