/**
 * Content extraction pipeline for full-text search indexing.
 *
 * Extracts text chunks from ebook files with source pointers for deep linking.
 * Each chunk represents a paragraph or section that can be individually searched.
 */

import type { PDFDocumentProxy } from "@colibri-hq/pdf";

/**
 * Source pointer for EPUB files.
 * Uses spine index for navigation and optional CFI for precise positioning.
 */
export type EpubPointer = { type: "epub"; spineIndex: number; itemId: string };

/**
 * Source pointer for MOBI files.
 * Uses record index and offset within the decompressed text.
 */
export type MobiPointer = { type: "mobi"; recordIndex: number; offset: number };

/**
 * Source pointer for PDF files.
 * Uses page number (1-indexed) and character offset.
 */
export type PdfPointer = { type: "pdf"; page: number; offset: number };

/**
 * Union type for all source pointer formats.
 */
export type SourcePointer = EpubPointer | MobiPointer | PdfPointer;

/**
 * A text chunk extracted from an ebook.
 */
export interface TextChunk {
  /** Plain text content of this chunk */
  content: string;
  /** Source location for deep linking back to the ebook */
  sourcePointer: SourcePointer;
  /** Sequential index of this chunk within the asset */
  chunkIndex: number;
}

/**
 * Configuration options for text extraction.
 */
export interface ExtractOptions {
  /** Maximum number of words per chunk (default: 500) */
  maxChunkWords?: number;
  /** Minimum number of words for a chunk to be included (default: 3) */
  minChunkWords?: number;
}

const DEFAULT_OPTIONS: Required<ExtractOptions> = { maxChunkWords: 500, minChunkWords: 3 };

/**
 * Extract searchable text chunks from an ebook file.
 *
 * @param file - The ebook file to extract text from
 * @param mediaType - The MIME type of the file
 * @param options - Configuration options
 * @returns Array of text chunks with source pointers
 */
export async function extractChunks(
  file: File,
  mediaType: string,
  options: ExtractOptions = {},
): Promise<TextChunk[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  switch (mediaType) {
    case "application/epub+zip":
      return extractEpubChunks(file, opts);
    case "application/x-mobipocket-ebook":
    case "application/x-mobi8-ebook":
      // MOBI text extraction not yet implemented
      // The MOBI parser currently only extracts metadata
      return [];
    case "application/pdf":
      return extractPdfChunks(file, opts);
    default:
      return [];
  }
}

/**
 * Split text into paragraphs.
 * Handles multiple newlines and trims whitespace.
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map((para) => para.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Count words in a string.
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Merge small paragraphs and split large ones to meet chunk size constraints.
 */
function normalizeChunks(paragraphs: string[], maxWords: number, minWords: number): string[] {
  const chunks: string[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    const paraWords = countWords(para);
    const bufferWords = countWords(buffer);

    // If paragraph alone exceeds max, split it
    if (paraWords > maxWords) {
      // Flush buffer first
      if (buffer) {
        chunks.push(buffer.trim());
        buffer = "";
      }
      // Split large paragraph by sentences
      const sentences = para.split(/(?<=[.!?])\s+/);
      let sentenceBuffer = "";
      for (const sentence of sentences) {
        if (countWords(sentenceBuffer + " " + sentence) > maxWords) {
          if (sentenceBuffer) {
            chunks.push(sentenceBuffer.trim());
          }
          sentenceBuffer = sentence;
        } else {
          sentenceBuffer = sentenceBuffer ? sentenceBuffer + " " + sentence : sentence;
        }
      }
      if (sentenceBuffer) {
        chunks.push(sentenceBuffer.trim());
      }
      continue;
    }

    // If adding this paragraph exceeds max, flush buffer
    if (bufferWords + paraWords > maxWords && buffer) {
      chunks.push(buffer.trim());
      buffer = para;
      continue;
    }

    // Accumulate in buffer
    buffer = buffer ? buffer + "\n\n" + para : para;
  }

  // Flush remaining buffer
  if (buffer && countWords(buffer) >= minWords) {
    chunks.push(buffer.trim());
  }

  // Filter out chunks that are too small
  return chunks.filter((chunk) => countWords(chunk) >= minWords);
}

/**
 * Extract text chunks from an EPUB file.
 */
async function extractEpubChunks(
  file: File,
  options: Required<ExtractOptions>,
): Promise<TextChunk[]> {
  // Dynamically import to avoid loading EPUB parsing code when not needed
  const { Epub } = await import("./epub/storyteller.mjs");

  const fileData = new Uint8Array(await file.arrayBuffer());
  const epub = await Epub.from(fileData);

  try {
    const spineItems = await epub.getSpineItems();
    const chunks: TextChunk[] = [];

    for (let spineIndex = 0; spineIndex < spineItems.length; spineIndex++) {
      const item = spineItems[spineIndex];

      // Skip non-XHTML items
      if (item.mediaType && !item.mediaType.includes("xhtml") && !item.mediaType.includes("html")) {
        continue;
      }

      try {
        const text = await epub.readXhtmlItemContents(item.id, "text");
        const paragraphs = splitIntoParagraphs(text);
        const normalizedChunks = normalizeChunks(
          paragraphs,
          options.maxChunkWords,
          options.minChunkWords,
        );

        for (const content of normalizedChunks) {
          chunks.push({
            content,
            sourcePointer: { type: "epub", spineIndex, itemId: item.id },
            chunkIndex: chunks.length,
          });
        }
      } catch {
        // Skip items that fail to parse (might be CSS, images, etc.)
        continue;
      }
    }

    return chunks;
  } finally {
    await epub.close();
  }
}

/**
 * Extract text chunks from a PDF file.
 */
async function extractPdfChunks(
  file: File,
  options: Required<ExtractOptions>,
): Promise<TextChunk[]> {
  // Dynamically import to avoid loading PDF.js when not needed
  const pdfjs = await import("@colibri-hq/pdf");

  const buffer = await file.arrayBuffer();
  const pdf: PDFDocumentProxy = await pdfjs.getDocument(buffer).promise;

  try {
    const chunks: TextChunk[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Concatenate all text items on the page
      const pageText = textContent.items
        .filter((item) => "str" in item)
        .map((item) => (item as { str: string }).str)
        .join(" ");

      if (!pageText.trim()) {
        continue;
      }

      const paragraphs = splitIntoParagraphs(pageText);
      const normalizedChunks = normalizeChunks(
        paragraphs,
        options.maxChunkWords,
        options.minChunkWords,
      );

      for (const content of normalizedChunks) {
        chunks.push({
          content,
          sourcePointer: {
            type: "pdf",
            page: pageNum,
            offset: 0, // Simplified - full offset tracking would require more work
          },
          chunkIndex: chunks.length,
        });
      }
    }

    return chunks;
  } finally {
    pdf.destroy();
  }
}
