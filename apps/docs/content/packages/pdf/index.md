---
title: PDF Package
description: PDF.js wrapper with conditional exports
date: 2024-01-01
order: 1
tags: [pdf, ebooks, parsing, developers]
relevance: 55
---

# PDF Package

The `@colibri-hq/pdf` package provides a PDF.js wrapper with conditional exports for different environments.

## Installation

```bash
npm install @colibri-hq/pdf
```

## Usage

The package automatically selects the correct build for your environment:

```typescript
import { getDocument } from "@colibri-hq/pdf";

const pdf = await getDocument(buffer).promise;
const page = await pdf.getPage(1);
const text = await page.getTextContent();
```

## Conditional Exports

The package provides different builds:

| Environment | Export                   | Description             |
| ----------- | ------------------------ | ----------------------- |
| Node.js     | `@colibri-hq/pdf`        | Server-side rendering   |
| Browser     | `@colibri-hq/pdf`        | Client-side with worker |
| Worker      | `@colibri-hq/pdf/worker` | Web worker context      |

## Metadata Extraction

```typescript
import { extractPdfMetadata } from "@colibri-hq/pdf";

const metadata = await extractPdfMetadata(buffer);

console.log(metadata.title);
console.log(metadata.author);
console.log(metadata.creationDate);
console.log(metadata.pageCount);
```

## Cover Extraction

Extract the first page as a cover image:

```typescript
import { extractPdfCover } from "@colibri-hq/pdf";

const cover = await extractPdfCover(buffer, { width: 300, format: "jpeg" });
```
