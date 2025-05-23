import type { Metadata } from "./metadata.js";
import type { PDFDocumentProxy } from "@colibri-hq/pdf";
import * as pdfjs from "@colibri-hq/pdf";

export async function isPdfFile(file: File): Promise<boolean> {
  const slices = new Uint8Array(await file.slice(0, 5).arrayBuffer());

  return (
    slices[0] === 0x25 &&
    slices[1] === 0x50 &&
    slices[2] === 0x44 &&
    slices[3] === 0x46 &&
    slices[4] === 0x2d
  );
}

export async function loadPdfMetadata(
  file: File,
  _signal?: AbortSignal,
): Promise<Metadata> {
  const document = await loadPdf(file);
  const metadata = await document.getMetadata();

  return {
    ...metadata,
    title:
      "Title" in metadata.info
        ? (String(metadata.info.Title) ?? undefined)
        : undefined,
    legalInformation:
      "Author" in metadata.info
        ? (String(metadata.info.Author) ?? undefined)
        : undefined,
    date:
      "CreationDate" in metadata.info
        ? (metadata.info.CreationDate ?? undefined)
        : undefined,
    contributors: [],
    pageCount: document.numPages,
  };
}

export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  const buffer = await file.arrayBuffer();

  return pdfjs.getDocument(buffer).promise;
}
