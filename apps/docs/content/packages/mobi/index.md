---
title: MOBI Parser
description: Parse MOBI/Mobipocket ebook files
date: 2024-01-01
order: 1
tags: [mobi, ebooks, parsing, developers]
relevance: 55
---

# MOBI Parser

The `@colibri-hq/mobi` package provides a robust parser for MOBI and Mobipocket ebook files.

## Installation

```bash
npm install @colibri-hq/mobi
```

## Quick Start

```typescript
import { parseMobi } from "@colibri-hq/mobi";
import { readFile } from "fs/promises";

const buffer = await readFile("book.mobi");
const metadata = await parseMobi(buffer);

console.log(metadata.title);
console.log(metadata.authors);
console.log(metadata.cover); // Buffer of cover image
```

## Supported Formats

| Format       | Extension | Support |
| ------------ | --------- | ------- |
| MOBI         | `.mobi`   | Full    |
| Mobipocket   | `.prc`    | Full    |
| Kindle (KF7) | `.azw`    | Full    |
| Kindle (KF8) | `.azw3`   | Full    |

## Metadata Extraction

The parser extracts:

- **Title** and subtitle
- **Authors** with proper name formatting
- **Publisher** and imprint
- **Publication date**
- **ISBN** (if embedded)
- **Language**
- **Description/Synopsis**
- **Cover image** (as Buffer)
- **ASIN** (Amazon identifier)

## API Reference

### parseMobi(buffer)

Parse a MOBI file from a Buffer.

```typescript
const metadata = await parseMobi(buffer);
```

Returns:

```typescript
interface MobiMetadata {
  title: string;
  titleFileAs?: string;
  authors: string[];
  publisher?: string;
  publishDate?: Date;
  isbn?: string;
  asin?: string;
  language?: string;
  description?: string;
  subjects?: string[];
  cover?: Buffer;
}
```

### MobiParser class

For more control, use the parser class directly:

```typescript
import { MobiParser } from "@colibri-hq/mobi";

const parser = new MobiParser(buffer);
const header = parser.getHeader();
const exth = parser.getEXTH();
const cover = parser.getCover();
```
