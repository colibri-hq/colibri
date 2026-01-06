# @colibri-hq/languages

ISO 639-3 language code resolution. Supports ISO 639-1, ISO 639-3, regional variants, and language names with O(1)
lookups.

## Features

- **Complete ISO 639-3 coverage**: All ~7900 languages from the official SIL standard
- **Flexible input handling**: Accepts ISO 639-1, ISO 639-3, regional variants, and language names
- **O(1) lookups**: Pre-built indexes for instant resolution
- **Zero runtime dependencies**: Self-contained with embedded language data

## Installation

```bash
npm install @colibri-hq/languages
# or
pnpm add @colibri-hq/languages
# or
yarn add @colibri-hq/languages
```

## Quick Start

```typescript
import { resolveLanguage, getLanguageByIso3 } from "@colibri-hq/languages";

// Resolve from any input format
resolveLanguage("en");       // { iso3: "eng", iso1: "en", name: "English", ... }
resolveLanguage("eng");      // { iso3: "eng", iso1: "en", name: "English", ... }
resolveLanguage("en-US");    // { iso3: "eng", iso1: "en", matchType: "regional", ... }
resolveLanguage("English");  // { iso3: "eng", iso1: "en", matchType: "name", ... }

// Direct lookups when you know the format
getLanguageByIso3("deu");    // { iso3: "deu", iso1: "de", name: "German", ... }
getLanguageByIso1("de");     // { iso3: "deu", iso1: "de", name: "German", ... }
getLanguageByName("German"); // { iso3: "deu", iso1: "de", name: "German", ... }
```

## API Reference

### Resolution Functions

#### `resolveLanguage(input: string): ResolvedLanguage | null`

Resolves a language code or name to a Language object. This is the primary function for flexible input handling.

**Supported inputs:**

- ISO 639-1 codes: `"en"`, `"de"`, `"fr"`
- ISO 639-3 codes: `"eng"`, `"deu"`, `"fra"`
- Regional variants: `"en-US"`, `"pt-BR"`, `"zh_TW"` (region is stripped)
- Language names: `"English"`, `"German"`, `"French"` (case-insensitive, exact match)

```typescript
const result = resolveLanguage("en-US");
// {
//   iso3: "eng",
//   iso1: "en",
//   name: "English",
//   type: "living",
//   input: "en-US",
//   matchType: "regional"
// }
```

Returns `null` if the input cannot be resolved.

#### `resolveLanguages(inputs: string[]): Map<string, ResolvedLanguage | null>`

Resolve multiple language inputs in bulk. Efficient for batch processing.

```typescript
const results = resolveLanguages(["en", "de", "invalid"]);
results.get("en");      // { iso3: "eng", ... }
results.get("invalid"); // null
```

#### `isValidLanguageCode(code: string): boolean`

Check if a string is a valid ISO 639-1 or ISO 639-3 code. Regional variants are also accepted.

```typescript
isValidLanguageCode("en");    // true
isValidLanguageCode("eng");   // true
isValidLanguageCode("en-US"); // true
isValidLanguageCode("xyz");   // false
```

### Direct Lookup Functions

Use these when you know the exact format of your input for slightly better performance.

#### `getLanguageByIso3(code: string): Language | null`

Look up a language by its 3-letter ISO 639-3 code.

```typescript
getLanguageByIso3("jpn"); // { iso3: "jpn", iso1: "ja", name: "Japanese", type: "living" }
```

#### `getLanguageByIso1(code: string): Language | null`

Look up a language by its 2-letter ISO 639-1 code.

```typescript
getLanguageByIso1("ja"); // { iso3: "jpn", iso1: "ja", name: "Japanese", type: "living" }
```

#### `getLanguageByName(name: string): Language | null`

Look up a language by its name (case-insensitive, exact match).

```typescript
getLanguageByName("Japanese"); // { iso3: "jpn", iso1: "ja", name: "Japanese", type: "living" }
```

### Data Access Functions

#### `getAllLanguages(): readonly Language[]`

Get all languages from the ISO 639-3 standard.

```typescript
const languages = getAllLanguages();
```

#### `getLanguageCount(): number`

Get the total number of languages in the dataset.

```typescript
console.log(getLanguageCount()); // ~7925
```

## Types

### `Language`

```typescript
interface Language {
  /** ISO 639-3 code (3 characters) */
  readonly iso3: string;
  /** ISO 639-1 code (2 characters), null if not assigned */
  readonly iso1: string | null;
  /** Language type classification */
  readonly type: LanguageType;
  /** Reference name from ISO 639-3 */
  readonly name: string;
}
```

### `LanguageType`

```typescript
type LanguageType = "living" | "historical" | "extinct" | "constructed" | "special";
```

### `ResolvedLanguage`

Extends `Language` with resolution metadata:

```typescript
interface ResolvedLanguage extends Language {
  /** The original input that was resolved */
  readonly input: string;
  /** How the resolution was made */
  readonly matchType: MatchType;
}

type MatchType = "iso3" | "iso1" | "name" | "regional";
```

## Common Use Cases

### Normalizing ebook metadata

```typescript
import { resolveLanguage } from "@colibri-hq/languages";

function normalizeBookLanguage(rawLanguage: string): string | null {
  const resolved = resolveLanguage(rawLanguage);
  return resolved?.iso3 ?? null;
}

// Works with various input formats from different sources
normalizeBookLanguage("en");       // "eng"
normalizeBookLanguage("English");  // "eng"
normalizeBookLanguage("en-US");    // "eng"
normalizeBookLanguage("eng");      // "eng"
```

### Bulk processing

```typescript
import { resolveLanguages } from "@colibri-hq/languages";

const bookLanguages = ["en", "de", "fr", "unknown", "ja"];
const resolved = resolveLanguages(bookLanguages);

for (const [input, language] of resolved) {
  if (language) {
    console.log(`${input} → ${language.iso3} (${language.name})`);
  } else {
    console.log(`${input} → could not resolve`);
  }
}
```

### Validating user input

```typescript
import { isValidLanguageCode, resolveLanguage } from "@colibri-hq/languages";

function validateLanguageInput(input: string): { valid: boolean; code?: string; error?: string } {
  if (!input) {
    return { valid: false, error: "Language is required" };
  }

  const resolved = resolveLanguage(input);
  if (!resolved) {
    return { valid: false, error: `Unknown language: ${input}` };
  }

  return { valid: true, code: resolved.iso3 };
}
```

### Getting display names

```typescript
import { getLanguageByIso3 } from "@colibri-hq/languages";

function getLanguageDisplayName(iso3Code: string): string {
  const language = getLanguageByIso3(iso3Code);
  return language?.name ?? iso3Code;
}

getLanguageDisplayName("eng"); // "English"
getLanguageDisplayName("deu"); // "German"
```

## Data Source

Language data is sourced
from [SIL International's ISO 639-3 Code Tables](https://iso639-3.sil.org/code_tables/download_tables), the official
registration authority for ISO 639-3.

The data includes:

- All ISO 639-3 language codes
- ISO 639-1 code mappings where available
- Language type classifications (living, historical, extinct, constructed, special)
- Reference names and alternative names from the Name Index

## License

[GNU AGPL v3](../../LICENSE)
