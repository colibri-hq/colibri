# @colibri-hq/mobi

A robust parser for MOBI (Mobipocket) ebook files for the Colibri ecosystem.

[![npm version](https://img.shields.io/npm/v/@colibri-hq/mobi.svg)](https://www.npmjs.com/package/@colibri-hq/mobi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The `@colibri-hq/mobi` package provides a comprehensive parser for MOBI (Mobipocket) files, allowing you to extract
metadata, content, and cover images from MOBI ebooks. It supports both older PalmDoc-based MOBI files and newer KF8
format.

MOBI is a proprietary ebook format based on the old PalmDoc format, with additional features. This parser handles the
complex structure of MOBI files, including:

- PalmDB headers
- PalmDoc compression
- MOBI headers
- EXTH (Extended Header) metadata
- Cover image extraction
- Various encoding formats

## Installation

```bash
# npm
npm install @colibri-hq/mobi
```

## Usage

### Basic Parsing

```typescript
import { parse } from "@colibri-hq/mobi";

// Parse a MOBI file
const fileInput = document.getElementById("file-input");
fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  const mobi = await parse(file);

  console.log("Title:", mobi.title);
  console.log("Author:", mobi.creator);
  console.log("Publisher:", mobi.publisher);

  // Access the cover image (if available)
  if (mobi.coverImage) {
    const blob = new Blob([mobi.coverImage], { type: "image/jpeg" });
    const imageUrl = URL.createObjectURL(blob);

    const img = document.createElement("img");
    img.src = imageUrl;
    document.body.appendChild(img);
  }
});
```

### Available Metadata

The parser extracts a rich set of metadata from the MOBI file:

```typescript
// Metadata available in the parsed object
const {
  // Basic info
  title, // Book title
  creator, // Author
  publisher, // Publisher

  // Publishing information
  publishingDate, // Publication date
  isbn, // ISBN number
  asin, // Amazon identifier

  // Content information
  language, // Book language
  locale, // Book locale
  subject, // Subject/category
  synopsis, // Book description

  // Technical details
  mobiHeader, // Raw MOBI header data
  palmDocHeader, // Raw PalmDoc header data
  pdbHeader, // Raw PDB header

  // Media
  coverImage, // Cover image as Uint8Array
} = mobi;
```

## API Reference

### Main Functions

#### `parse(file: File): Promise<MobiBook>`

Parses a MOBI file and returns a promise that resolves to a `MobiBook` object containing all the extracted data.

- **Parameters:**
  - `file`: A File object representing the MOBI file to parse

- **Returns:**
  - Promise resolving to a `MobiBook` object

### Types

#### `MobiBook`

Object containing the parsed MOBI data, including metadata and content.

```typescript
interface MobiBook {
  // PDB header information
  pdbHeader: PalmDbHeader;

  // PalmDoc header information
  palmDocHeader: PalmDocHeader;

  // MOBI header information
  mobiHeader: MobiHeader;

  // Index header (if available)
  indexHeader?: IndexHeader;

  // Book title
  title: string;

  // Extra record data flags
  extraRecordDataFlags: {
    hasExtraMultibyteBytes: boolean;
    hasTbsIndexingDescription: boolean;
    hasUncrossableBreaks: boolean;
  };

  // Metadata from EXTH header (if available)
  creator?: string;
  publisher?: string;
  synopsis?: string;
  isbn?: string;
  subject?: string | string[];
  publishingDate?: Date;
  language?: string;
  locale?: Locale;

  // Cover image (lazy loaded)
  coverImage?: Uint8Array;
}
```

## MOBI Format Reference

### Structure Overview

MOBI files are composed of:

1. **PalmDB Header** - General container information
2. **PalmDoc Header** - Basic ebook parameters
3. **MOBI Header** - MOBI-specific metadata
4. **EXTH Header** (optional) - Extended metadata
5. **Content Records** - The book content
6. **Index Records** (optional) - Navigation information
7. **Image Records** (optional) - Images used in the book

### PalmDB Header

The PalmDB header contains basic information about the database file:

- File name/identifier
- Attributes
- Version
- Creation/modification timestamps
- Record information

### MOBI Header

The MOBI header contains MOBI-specific information:

- Encoding
- Language/locale
- File version
- Image record locations
- DRM information

### EXTH (Extended Header)

The EXTH header contains additional metadata about the book, including:

- Author (creator)
- Publisher
- Description
- ISBN
- Cover image pointers
- Language information
- Publication date
- Rights/restrictions

## References

- [MOBI Format Documentation](https://wiki.mobileread.com/wiki/MOBI)
- [PalmDB Format](https://wiki.mobileread.com/wiki/PDB)

## License

MIT
