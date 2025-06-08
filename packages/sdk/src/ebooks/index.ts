import { isZipFile, loadEpubMetadata } from "./epub.js";
import { isMobiFile, loadMobiMetadata } from "./mobi.js";
import { isPdfFile, loadPdfMetadata } from "./pdf.js";
import type { Metadata } from "./metadata.js";
import TurndownService from "turndown";

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

const metadataLoaders = {
  epub: loadEpubMetadata,
  mobi: loadMobiMetadata,
  pdf: loadPdfMetadata,
};

export async function loadMetadata(
  file: File,
  signal?: AbortSignal,
): Promise<Metadata> {
  const type = await detectType(file);
  const loader = metadataLoaders[type];

  if (!loader) {
    throw new Error(`Unsupported format: "${type}"`);
  }

  const metadata = await loader(file, signal);

  return {
    ...metadata,
    get synopsis() {
      const synopsis = metadata?.synopsis;

      if (!synopsis) {
        return undefined;
      }

      return parseHtml(synopsis);
    },
  };
}

function parseHtml(html: string) {
  const turndownService = new TurndownService({
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    fence: "```",
    headingStyle: "atx",
    hr: "---",
    linkStyle: "inlined",
    preformattedCode: true,
    strongDelimiter: "**",
  });

  return turndownService.turndown(html);
}

export { loadEpubMetadata, loadEpub, isZipFile } from "./epub.js";
export { loadPdfMetadata, loadPdf, isPdfFile } from "./pdf.js";
export { loadMobiMetadata, loadMobi, isMobiFile } from "./mobi.js";
export type { Metadata } from "./metadata.js";
export * from "./contributions.js";
