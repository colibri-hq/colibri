import type { PDFDocumentProxy } from "@colibri-hq/pdf";
import * as pdfjs from "@colibri-hq/pdf";
import type { Metadata } from "./metadata.js";

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

export async function loadPdfMetadata(file: File, _signal?: AbortSignal): Promise<Metadata> {
  const document = await loadPdf(file);
  const { info, metadata } = await document.getMetadata();
  const { Author, CreationDate, Keywords, Language, ModDate, Title, Subject, ...properties } =
    Object.fromEntries(Object.entries(info));
  const dateCreated = parseDate(CreationDate);
  const dateModified = parseDate(ModDate);

  return {
    contributors: Author ? [{ name: Author, roles: ["aut"], sortingKey: Author }] : [],
    dateCreated,
    dateModified,
    legalInformation: undefined,
    numberOfPages: document.numPages,
    language: Language ?? undefined,
    title: Title ?? file.name,
    synopsis: Subject ?? undefined,
    tags: parseKeywords(Keywords),
    properties,
    ...metadata,
  };
}

function parseDate(date: string | undefined) {
  if (!date) {
    return undefined;
  }

  const match = date.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);

  if (!match) {
    return undefined;
  }

  const [, year, month, day, hour, minute, second] = match;

  return new Date(
    Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second),
    ),
  );
}

function parseKeywords(keywords: string | null | undefined) {
  if (!keywords) {
    return [];
  }

  const commaCount = (keywords.match(/,/g) || []).length;
  const semicolonCount = (keywords.match(/;/g) || []).length;
  const delimiter = commaCount >= semicolonCount ? "," : ";";

  return keywords
    .split(delimiter)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  const buffer = await file.arrayBuffer();

  return pdfjs.getDocument(buffer).promise;
}
