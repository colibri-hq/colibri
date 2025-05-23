import { isZipFile, loadEpubMetadata } from "./epub.js";
import { isMobiFile, loadMobiMetadata } from "./mobi.js";
import { isPdfFile, loadPdfMetadata } from "./pdf.js";
import type { Metadata } from "./metadata.js";

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

export async function loadMetadata(
  file: File,
  signal?: AbortSignal,
): Promise<Metadata> {
  const type = await detectType(file);

  switch (type) {
    case "epub": {
      return loadEpubMetadata(file, signal);
    }

    case "mobi": {
      return loadMobiMetadata(file, signal);
    }

    case "pdf": {
      return loadPdfMetadata(file, signal);
    }

    // TODO: Add additional formats support

    default: {
      throw new Error(`Unsupported file type: ${type}`);
    }
  }
}

export { loadEpubMetadata, loadEpub, isZipFile } from "./epub.js";
export { loadPdfMetadata, loadPdf, isPdfFile } from "./pdf.js";
export { loadMobiMetadata, loadMobi, isMobiFile } from "./mobi.js";
export type { Metadata } from "./metadata.js";
export * from "./contributions.js";
