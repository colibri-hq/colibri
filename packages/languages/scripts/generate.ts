/**
 * Generates TypeScript data and SQL seed from downloaded ISO 639-3 data.
 *
 * Run with: pnpm --filter @colibri-hq/languages run generate
 *
 * Prerequisites: Run `pnpm download` first to get the source data.
 */

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const GENERATED_DIR = join(__dirname, '..', 'src', 'generated');
const SUPABASE_SEEDS_DIR = join(
  __dirname,
  '..',
  '..',
  '..',
  'supabase',
  'seeds',
);

// Map SIL language types to our enum values
const TYPE_MAP: Record<string, string> = {
  L: 'living',
  H: 'historical',
  E: 'extinct',
  C: 'constructed',
  S: 'special',
  A: 'living', // Ancient (mapped to historical would be more accurate, but using living for compatibility)
};

// PostgreSQL full-text search configurations mapped to ISO 639-3 codes
// See: https://www.postgresql.org/docs/current/textsearch-configuration.html
const FTS_CONFIG_MAP: Record<string, string> = {
  ara: 'arabic',
  hye: 'armenian',
  eus: 'basque',
  cat: 'catalan',
  dan: 'danish',
  nld: 'dutch',
  eng: 'english',
  fin: 'finnish',
  fra: 'french',
  deu: 'german',
  ell: 'greek',
  hin: 'hindi',
  hun: 'hungarian',
  ind: 'indonesian',
  gle: 'irish',
  ita: 'italian',
  lit: 'lithuanian',
  npi: 'nepali',
  nor: 'norwegian',
  nob: 'norwegian', // Norwegian Bokmål
  nno: 'norwegian', // Norwegian Nynorsk
  por: 'portuguese',
  ron: 'romanian',
  rus: 'russian',
  srp: 'serbian',
  spa: 'spanish',
  swe: 'swedish',
  tam: 'tamil',
  tur: 'turkish',
  yid: 'yiddish',
};

interface RawLanguage {
  id: string; // ISO 639-3 code
  part2b: string | null; // ISO 639-2/B code
  part2t: string | null; // ISO 639-2/T code
  part1: string | null; // ISO 639-1 code
  scope: string;
  languageType: string;
  refName: string;
  comment: string | null;
}

interface Language {
  iso3: string;
  iso1: string | null;
  type: string;
  name: string;
  ftsConfig: string;
}

interface NameIndex {
  id: string;
  printName: string;
  invertedName: string;
}

function parseTSV<T>(content: string, parser: (row: string[]) => T): T[] {
  const lines = content.trim().split('\n');
  // Skip header row
  return lines.slice(1).map((line) => parser(line.split('\t')));
}

function parseLanguageRow(row: string[]): RawLanguage {
  return {
    id: row[0],
    part2b: row[1] || null,
    part2t: row[2] || null,
    part1: row[3] || null,
    scope: row[4],
    languageType: row[5],
    refName: row[6],
    comment: row[7] || null,
  };
}

function parseNameIndexRow(row: string[]): NameIndex {
  return {
    id: row[0],
    printName: row[1],
    invertedName: row[2],
  };
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function escapeTS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function main(): Promise<void> {
  console.log('Reading source data...');

  const languagesContent = await readFile(
    join(DATA_DIR, 'iso-639-3.tab'),
    'utf-8',
  );
  const nameIndexContent = await readFile(
    join(DATA_DIR, 'iso-639-3_Name_Index.tab'),
    'utf-8',
  );

  const rawLanguages = parseTSV(languagesContent, parseLanguageRow);
  const nameIndex = parseTSV(nameIndexContent, parseNameIndexRow);

  console.log(
    `Parsed ${rawLanguages.length} languages and ${nameIndex.length} name entries`,
  );

  // Build name lookup map (ID -> list of alternative names)
  const alternativeNames = new Map<string, string[]>();
  for (const entry of nameIndex) {
    const names = alternativeNames.get(entry.id) ?? [];
    // Add both print name and inverted name (e.g., "German" and "German, Standard")
    if (entry.printName && !names.includes(entry.printName)) {
      names.push(entry.printName);
    }
    if (entry.invertedName && !names.includes(entry.invertedName)) {
      names.push(entry.invertedName);
    }
    alternativeNames.set(entry.id, names);
  }

  // Convert to our Language format
  const languages: Language[] = rawLanguages.map((raw) => ({
    iso3: raw.id.toLowerCase(),
    iso1: raw.part1?.toLowerCase() ?? null,
    type: TYPE_MAP[raw.languageType] ?? 'living',
    name: raw.refName,
    ftsConfig: FTS_CONFIG_MAP[raw.id.toLowerCase()] ?? 'simple',
  }));

  // Sort by ISO 639-3 code for consistent output
  languages.sort((a, b) => a.iso3.localeCompare(b.iso3));

  console.log('Generating TypeScript...');
  await mkdir(GENERATED_DIR, { recursive: true });

  // Build indexes
  const iso3Entries: string[] = [];
  const iso1Entries: string[] = [];
  const nameEntries: string[] = [];

  languages.forEach((lang, index) => {
    // ISO 639-3 index
    iso3Entries.push(`  ["${lang.iso3}", ${index}]`);

    // ISO 639-1 index (only for languages that have one)
    if (lang.iso1) {
      iso1Entries.push(`  ["${lang.iso1}", ${index}]`);
    }

    // Name index (reference name)
    nameEntries.push(`  ["${escapeTS(lang.name.toLowerCase())}", ${index}]`);

    // Alternative names from the name index
    const altNames = alternativeNames.get(lang.iso3.toUpperCase()) ?? [];
    for (const altName of altNames) {
      const normalizedAlt = altName.toLowerCase();
      // Don't duplicate the reference name
      if (normalizedAlt !== lang.name.toLowerCase()) {
        nameEntries.push(`  ["${escapeTS(normalizedAlt)}", ${index}]`);
      }
    }
  });

  // Generate TypeScript file
  const tsContent = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * Generated from ISO 639-3 data from SIL International.
 * Source: https://iso639-3.sil.org/code_tables/download_tables
 * Generated: ${new Date().toISOString().split('T')[0]}
 *
 * Regenerate with: pnpm --filter @colibri-hq/languages run update
 */

import type { Language, LanguageType } from "../types.js";

/**
 * All ISO 639-3 languages (${languages.length} entries).
 */
export const LANGUAGES: readonly Language[] = Object.freeze([
${languages
  .map(
    (l) =>
      `  { iso3: "${l.iso3}", iso1: ${l.iso1 ? `"${l.iso1}"` : 'null'}, type: "${l.type}" as LanguageType, name: "${escapeTS(l.name)}", ftsConfig: "${l.ftsConfig}" }`,
  )
  .join(',\n')}
]);

/**
 * Index: ISO 639-3 code (lowercase) -> array index
 */
export const ISO3_INDEX: ReadonlyMap<string, number> = new Map([
${iso3Entries.join(',\n')}
]);

/**
 * Index: ISO 639-1 code (lowercase) -> array index
 * Only includes languages that have an ISO 639-1 code assigned.
 */
export const ISO1_INDEX: ReadonlyMap<string, number> = new Map([
${iso1Entries.join(',\n')}
]);

/**
 * Index: Language name (lowercase) -> array index
 * Includes reference names and alternative names from the ISO 639-3 Name Index.
 */
export const NAME_INDEX: ReadonlyMap<string, number> = new Map([
${nameEntries.join(',\n')}
]);
`;

  await writeFile(join(GENERATED_DIR, 'languages.ts'), tsContent, 'utf-8');
  console.log(
    `Generated languages.ts (${languages.length} languages, ${iso1Entries.length} ISO 639-1 codes, ${nameEntries.length} name entries)`,
  );

  // Generate SQL seed
  console.log('Generating SQL seed...');

  const sqlContent = `-- AUTO-GENERATED FILE - DO NOT EDIT
--
-- Generated from ISO 639-3 data from SIL International.
-- Source: https://iso639-3.sil.org/code_tables/download_tables
-- Generated: ${new Date().toISOString().split('T')[0]}
--
-- Regenerate with: pnpm --filter @colibri-hq/languages run update

insert into public.language (iso_639_3, iso_639_1, type, name, fts_config) values
${languages
  .map(
    (l) =>
      `('${l.iso3}', ${l.iso1 ? `'${l.iso1}'` : 'null'}, '${l.type}', '${escapeSQL(l.name)}', '${l.ftsConfig}')`,
  )
  .join(',\n')};
`;

  await writeFile(join(GENERATED_DIR, 'languages.sql'), sqlContent, 'utf-8');
  console.log(`Generated languages.sql`);

  // Copy SQL seed to supabase/seeds/
  console.log('Copying SQL seed to supabase/seeds/...');
  await copyFile(
    join(GENERATED_DIR, 'languages.sql'),
    join(SUPABASE_SEEDS_DIR, 'languages.sql'),
  );
  console.log('Copied to supabase/seeds/languages.sql');

  console.log('\nGeneration complete!');
}

main().catch((error) => {
  console.error('Generation failed:', error);
  process.exit(1);
});
