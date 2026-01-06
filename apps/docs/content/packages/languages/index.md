---
title: Languages Package
description: ISO 639-3 language code utilities
date: 2024-01-01
order: 1
tags: [languages, iso639, developers, reference]
relevance: 50
---

# Languages Package

The `@colibri-hq/languages` package provides utilities for working with ISO 639-3 language codes.

## Installation

```bash
npm install @colibri-hq/languages
```

## Usage

### Resolve Language Codes

```typescript
import { resolveLanguage } from "@colibri-hq/languages";

// From ISO 639-1 (2-letter)
const lang1 = resolveLanguage("en");
console.log(lang1.name); // "English"
console.log(lang1.iso639_3); // "eng"

// From ISO 639-3 (3-letter)
const lang2 = resolveLanguage("deu");
console.log(lang2.name); // "German"

// From language name
const lang3 = resolveLanguage("French");
console.log(lang3.iso639_1); // "fr"
```

### Get All Languages

```typescript
import { getAllLanguages } from "@colibri-hq/languages";

const languages = getAllLanguages();
// Array of all ISO 639-3 languages
```

### Check if Valid

```typescript
import { isValidLanguageCode } from "@colibri-hq/languages";

isValidLanguageCode("en"); // true
isValidLanguageCode("eng"); // true
isValidLanguageCode("xyz"); // false
```

## Language Object

```typescript
interface Language {
  iso639_3: string; // 3-letter code
  iso639_1?: string; // 2-letter code (if exists)
  name: string; // English name
  type: "living" | "historical" | "constructed" | "ancient";
  scope: "individual" | "macrolanguage" | "special";
}
```
