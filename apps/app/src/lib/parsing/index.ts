import type { Relator } from "$lib/parsing/contributions";
import { isZipFile } from "$lib/parsing/epub";
import { isMobiFile } from "$lib/parsing/mobi";
import { isPdfFile } from "$lib/parsing/pdf";

export async function detectType(file: File) {
  if (await isPdfFile(file)) {
    return "pdf";
  }

  if (await isMobiFile(file)) {
    return "mobi";
  }

  if (await isZipFile(file)) {
    return "epub";
  }

  throw new Error("Unsupported file format");
}

export type Metadata = {
  title: string;
  contributors: {
    name: string;
    roles: Relator[];
    sortingKey: string;
  }[];
  language?: string | undefined;
  numberOfPages?: number | undefined;
  legalInformation?: string | undefined;
  cover?: Blob | undefined;
};
