import type { Metadata } from '$lib/parsing/index';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export async function isPdfFile(file: File) {
  const slices = new Uint8Array(await file.slice(0, 5).arrayBuffer());

  return (
    slices[0] === 0x25 &&
    slices[1] === 0x50 &&
    slices[2] === 0x44 &&
    slices[3] === 0x46 &&
    slices[4] === 0x2d
  );
}

export async function getMetadata(file: File) {
  const document = await load(file);
  const metadata = await document.getMetadata();

  return {
    ...metadata,
    title: metadata.info.Title ?? undefined,
    legalInformation: metadata.info.Author ?? undefined,
    date: metadata.info.CreationDate ?? undefined,
    contributors: [],
    pageCount: document.numPages,
  } as Metadata;
}

async function load(file: File) {
  const buffer = await file.arrayBuffer();

  return pdfjs.getDocument(buffer).promise;
}
