/**
 * MARC21 XML Parser utilities
 *
 * Parses MARC21 records from SRU (Search/Retrieve via URL) responses.
 * Used by Library of Congress and DNB (Deutsche Nationalbibliothek) providers.
 *
 * MARC21 structure:
 * - Leader: 24-character string with record metadata
 * - Control fields (001-009): Fixed-length fields without subfields
 * - Data fields (010-999): Variable-length fields with subfields
 *
 * @see https://www.loc.gov/marc/bibliographic/
 */

import { normalizeLanguageCode } from "./normalization.js";

/**
 * MARC21 subfield
 */
export interface MarcSubfield {
  /** Subfield code (single character, typically a-z or 0-9) */
  code: string;
  /** Subfield value */
  value: string;
}

/**
 * MARC21 data field (tags 010-999)
 */
export interface MarcDataField {
  /** Field tag (3 digits) */
  tag: string;
  /** First indicator character */
  indicator1: string;
  /** Second indicator character */
  indicator2: string;
  /** Subfields */
  subfields: MarcSubfield[];
}

/**
 * MARC21 control field (tags 001-009)
 */
export interface MarcControlField {
  /** Field tag (3 digits) */
  tag: string;
  /** Field value */
  value: string;
}

/**
 * Parsed MARC21 record
 */
export interface MarcRecord {
  /** Leader (24 characters) */
  leader: string;
  /** Control fields (001-009) */
  controlFields: MarcControlField[];
  /** Data fields (010-999) */
  dataFields: MarcDataField[];
}

/**
 * Extracted bibliographic data from a MARC record
 */
export interface MarcBibliographicData {
  /** Title (245$a) */
  title?: string | undefined;
  /** Subtitle (245$b) */
  subtitle?: string | undefined;
  /** Authors (100$a, 700$a) */
  authors: string[];
  /** ISBNs (020$a) */
  isbns: string[];
  /** Publisher (260$b or 264$b) */
  publisher?: string | undefined;
  /** Publication year */
  publicationYear?: number | undefined;
  /** Publication place (260$a or 264$a) */
  publicationPlace?: string | undefined;
  /** Language code (008 positions 35-37 or 041$a) */
  language?: string | undefined;
  /** Subjects (650$a) */
  subjects: string[];
  /** Page count (from 300$a) */
  pageCount?: number | undefined;
  /** Physical dimensions (from 300$c) */
  dimensions?: string | undefined;
  /** Series name (490$a or 830$a) */
  seriesName?: string | undefined;
  /** Series position (490$v or 830$v) */
  seriesPosition?: string | undefined;
  /** Edition statement (250$a) */
  edition?: string | undefined;
  /** Summary/description (520$a) */
  description?: string | undefined;
  /** Control number (001) */
  controlNumber?: string | undefined;
  /** LCCN (010$a) */
  lccn?: string | undefined;
  /** LC Call Number (050$a$b) */
  lcCallNumber?: string | undefined;
  /** Dewey Decimal Classification (082$a) */
  deweyNumber?: string | undefined;
  /** Record type (leader position 6) */
  recordType?: string | undefined;
  /** Bibliographic level (leader position 7) */
  bibliographicLevel?: string | undefined;
  /** GND (German authority) IDs */
  gndIds?: string[] | undefined;
}

/**
 * Parse MARC21 XML records from an SRU response
 *
 * @param xmlText - Full XML response text
 * @returns Array of parsed MARC records
 */
export function parseMarcXmlRecords(xmlText: string): MarcRecord[] {
  const records: MarcRecord[] = [];

  // Match MARC21 record elements
  // Supports both Library of Congress and DNB XML namespaces
  const recordPattern =
    /<record[^>]*(?:xmlns="http:\/\/www\.loc\.gov\/MARC21\/slim")?[^>]*>([\s\S]*?)<\/record>/gi;
  const matches = xmlText.matchAll(recordPattern);

  for (const match of matches) {
    const recordXml = match[0];
    const record = parseSingleMarcRecord(recordXml);
    if (record) {
      records.push(record);
    }
  }

  return records;
}

/**
 * Parse a single MARC21 record from XML
 */
function parseSingleMarcRecord(recordXml: string): MarcRecord | null {
  try {
    // Extract leader
    const leaderMatch = recordXml.match(/<leader>([^<]*)<\/leader>/i);
    const leader = leaderMatch ? leaderMatch[1] : "";

    // Extract control fields
    const controlFields: MarcControlField[] = [];
    const controlFieldPattern =
      /<controlfield[^>]*tag="([^"]*)"[^>]*>([^<]*)<\/controlfield>/gi;
    const cfMatches = recordXml.matchAll(controlFieldPattern);

    for (const cfMatch of cfMatches) {
      controlFields.push({
        tag: cfMatch[1],
        value: cfMatch[2],
      });
    }

    // Extract data fields
    const dataFields: MarcDataField[] = [];
    const dataFieldPattern =
      /<datafield[^>]*tag="([^"]*)"[^>]*(?:ind1="([^"]*)")?[^>]*(?:ind2="([^"]*)")?[^>]*>([\s\S]*?)<\/datafield>/gi;
    const dfMatches = recordXml.matchAll(dataFieldPattern);

    for (const dfMatch of dfMatches) {
      const subfields: MarcSubfield[] = [];
      const subfieldPattern =
        /<subfield[^>]*code="([^"]*)"[^>]*>([^<]*)<\/subfield>/gi;
      const sfMatches = dfMatch[4].matchAll(subfieldPattern);

      for (const sfMatch of sfMatches) {
        subfields.push({
          code: sfMatch[1],
          value: decodeXmlEntities(sfMatch[2]),
        });
      }

      // Also try without explicit attribute quotes for malformed XML
      const ind1Match = dfMatch[0].match(/ind1="([^"]*)"/);
      const ind2Match = dfMatch[0].match(/ind2="([^"]*)"/);

      dataFields.push({
        tag: dfMatch[1],
        indicator1: ind1Match ? ind1Match[1] : " ",
        indicator2: ind2Match ? ind2Match[1] : " ",
        subfields,
      });
    }

    return { leader, controlFields, dataFields };
  } catch {
    return null;
  }
}

/**
 * Decode common XML entities
 */
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

/**
 * Get a control field value by tag
 *
 * @param record - MARC record
 * @param tag - Field tag (e.g., "001", "008")
 * @returns Field value or undefined
 */
export function getControlField(
  record: MarcRecord,
  tag: string,
): string | undefined {
  const field = record.controlFields.find((cf) => cf.tag === tag);
  return field?.value;
}

/**
 * Get all data fields with a specific tag
 *
 * @param record - MARC record
 * @param tag - Field tag (e.g., "245", "650")
 * @returns Array of matching data fields
 */
export function getDataFields(
  record: MarcRecord,
  tag: string,
): MarcDataField[] {
  return record.dataFields.filter((df) => df.tag === tag);
}

/**
 * Get the first data field with a specific tag
 *
 * @param record - MARC record
 * @param tag - Field tag
 * @returns First matching field or undefined
 */
export function getDataField(
  record: MarcRecord,
  tag: string,
): MarcDataField | undefined {
  return record.dataFields.find((df) => df.tag === tag);
}

/**
 * Get a subfield value from a data field
 *
 * @param field - MARC data field
 * @param code - Subfield code (e.g., "a", "b")
 * @returns First matching subfield value or undefined
 */
export function getSubfield(
  field: MarcDataField,
  code: string,
): string | undefined {
  const subfield = field.subfields.find((sf) => sf.code === code);
  return subfield?.value;
}

/**
 * Get all subfield values with a specific code from a data field
 *
 * @param field - MARC data field
 * @param code - Subfield code
 * @returns Array of subfield values
 */
export function getAllSubfields(field: MarcDataField, code: string): string[] {
  return field.subfields.filter((sf) => sf.code === code).map((sf) => sf.value);
}

/**
 * Get subfield values from all fields with a specific tag
 *
 * @param record - MARC record
 * @param tag - Field tag
 * @param codes - Subfield codes to extract
 * @returns Array of subfield values
 */
export function getSubfieldValues(
  record: MarcRecord,
  tag: string,
  codes: string[],
): string[] {
  const values: string[] = [];
  const fields = getDataFields(record, tag);

  for (const field of fields) {
    for (const subfield of field.subfields) {
      if (codes.includes(subfield.code) && subfield.value.trim()) {
        values.push(subfield.value.trim());
      }
    }
  }

  return values;
}

/**
 * Get the first subfield value from a field tag and code
 *
 * @param record - MARC record
 * @param tag - Field tag
 * @param code - Subfield code
 * @returns First matching value or undefined
 */
export function getFirstSubfield(
  record: MarcRecord,
  tag: string,
  code: string,
): string | undefined {
  const field = getDataField(record, tag);
  if (!field) return undefined;
  return getSubfield(field, code);
}

/**
 * Extract comprehensive bibliographic data from a MARC record
 *
 * @param record - Parsed MARC record
 * @returns Extracted bibliographic data
 */
export function extractBibliographicData(
  record: MarcRecord,
): MarcBibliographicData {
  const data: MarcBibliographicData = {
    authors: [],
    isbns: [],
    subjects: [],
  };

  // Control number (001)
  data.controlNumber = getControlField(record, "001");

  // Leader information
  if (record.leader && record.leader.length >= 8) {
    data.recordType = record.leader.charAt(6);
    data.bibliographicLevel = record.leader.charAt(7);
  }

  // Title (245$a and 245$b)
  data.title = extractTitle(record);
  data.subtitle = extractSubtitle(record);

  // Authors (100, 110, 111, 700, 710, 711)
  data.authors = extractAuthors(record);

  // ISBNs (020$a)
  data.isbns = extractIsbns(record);

  // Publisher and publication info (260, 264)
  const pubInfo = extractPublicationInfo(record);
  data.publisher = pubInfo.publisher;
  data.publicationYear = pubInfo.year;
  data.publicationPlace = pubInfo.place;

  // Language (008 positions 35-37, or 041$a)
  data.language = extractLanguage(record);

  // Subjects (650, 651, 655)
  data.subjects = extractSubjects(record);

  // Physical description (300)
  const physDesc = extractPhysicalDescription(record);
  data.pageCount = physDesc.pageCount;
  data.dimensions = physDesc.dimensions;

  // Series (490, 830)
  const seriesInfo = extractSeries(record);
  data.seriesName = seriesInfo.name;
  data.seriesPosition = seriesInfo.position;

  // Edition (250$a)
  data.edition = getFirstSubfield(record, "250", "a")
    ?.replace(/[.]$/, "")
    .trim();

  // Description/Summary (520$a)
  data.description = getFirstSubfield(record, "520", "a");

  // LCCN (010$a)
  data.lccn = getFirstSubfield(record, "010", "a")?.trim();

  // LC Call Number (050$a$b)
  const callNumberParts = getSubfieldValues(record, "050", ["a", "b"]);
  if (callNumberParts.length > 0) {
    data.lcCallNumber = callNumberParts.join(" ");
  }

  // Dewey Decimal Classification (082$a)
  data.deweyNumber = getFirstSubfield(record, "082", "a");

  // GND IDs (from 100$0, 700$0)
  data.gndIds = extractGndIds(record);

  return data;
}

/**
 * Extract title from 245$a
 */
export function extractTitle(record: MarcRecord): string | undefined {
  const titleField = getDataField(record, "245");
  if (!titleField) return undefined;

  const title = getSubfield(titleField, "a");
  if (!title) return undefined;

  // Clean up trailing punctuation
  return title.replace(/[/:]$/, "").trim();
}

/**
 * Extract subtitle from 245$b
 */
export function extractSubtitle(record: MarcRecord): string | undefined {
  const titleField = getDataField(record, "245");
  if (!titleField) return undefined;

  const subtitle = getSubfield(titleField, "b");
  if (!subtitle) return undefined;

  // Clean up trailing punctuation
  return subtitle.replace(/[/.]$/, "").trim();
}

/**
 * Extract authors from personal and corporate author fields
 */
export function extractAuthors(record: MarcRecord): string[] {
  const authors: string[] = [];

  // Personal author fields
  const personalAuthorFields = ["100", "700"];
  // Corporate author fields
  const corporateAuthorFields = ["110", "710"];
  // Meeting/conference names
  const meetingFields = ["111", "711"];

  const allAuthorFields = [
    ...personalAuthorFields,
    ...corporateAuthorFields,
    ...meetingFields,
  ];

  for (const tag of allAuthorFields) {
    const values = getSubfieldValues(record, tag, ["a"]);
    for (const value of values) {
      const cleaned = cleanAuthorName(value);
      if (cleaned && !authors.includes(cleaned)) {
        authors.push(cleaned);
      }
    }
  }

  return authors;
}

/**
 * Clean author name from MARC format
 */
function cleanAuthorName(name: string): string {
  let cleaned = name
    // Remove trailing punctuation
    .replace(/[,.]$/, "")
    // Remove dates like ", 1950-2020" or "(1903-1950)"
    .replace(/[,(]\s*\d{4}\s*-\s*\d{0,4}\)?\.?$/, "")
    .trim();

  // Convert "Last, First" to "First Last"
  if (cleaned.includes(",")) {
    const parts = cleaned.split(",").map((part) => part.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      cleaned = `${parts[1]} ${parts[0]}`;
    }
  }

  return cleaned;
}

/**
 * Extract ISBNs from 020$a
 */
export function extractIsbns(record: MarcRecord): string[] {
  const isbns: string[] = [];
  const values = getSubfieldValues(record, "020", ["a"]);

  for (const value of values) {
    // Extract just the ISBN, removing qualifiers like "(hardcover)"
    const isbn = value.replace(/\s.*$/, "").replace(/[^0-9Xx]/g, "");
    if (isbn.length === 10 || isbn.length === 13) {
      if (!isbns.includes(isbn)) {
        isbns.push(isbn);
      }
    }
  }

  return isbns;
}

/**
 * Extract publication information from 260 or 264 fields
 */
export function extractPublicationInfo(record: MarcRecord): {
  publisher?: string | undefined;
  year?: number | undefined;
  place?: string | undefined;
} {
  // Try 264 first (RDA format), then 260 (AACR2)
  const pubFields = [
    ...getDataFields(record, "264"),
    ...getDataFields(record, "260"),
  ];

  let publisher: string | undefined;
  let year: number | undefined;
  let place: string | undefined;

  for (const field of pubFields) {
    // Publisher (subfield b)
    if (!publisher) {
      const pubValue = getSubfield(field, "b");
      if (pubValue) {
        publisher = pubValue
          .replace(/[,;:]$/, "")
          .replace(/^\[/, "")
          .replace(/]$/, "")
          .trim();
      }
    }

    // Date (subfield c)
    if (!year) {
      const dateValue = getSubfield(field, "c");
      if (dateValue) {
        const yearMatch = dateValue.match(/(\d{4})/);
        if (yearMatch) {
          const y = parseInt(yearMatch[1], 10);
          if (y >= 1000 && y <= new Date().getFullYear() + 5) {
            year = y;
          }
        }
      }
    }

    // Place (subfield a)
    if (!place) {
      const placeValue = getSubfield(field, "a");
      if (placeValue) {
        place = placeValue
          .replace(/[:]$/, "")
          .replace(/^\[/, "")
          .replace(/]$/, "")
          .trim();
      }
    }
  }

  return { publisher, year, place };
}

/**
 * Extract language code from 008 (positions 35-37) or 041$a
 * Returns normalized ISO 639-1 code when possible
 */
export function extractLanguage(record: MarcRecord): string | undefined {
  let langCode: string | undefined;

  // First try 008 control field (positions 35-37)
  const field008 = getControlField(record, "008");
  if (field008 && field008.length >= 38) {
    const code = field008.substring(35, 38).trim();
    if (code && code !== "   ") {
      langCode = code;
    }
  }

  // Fallback to 041$a
  if (!langCode) {
    langCode = getFirstSubfield(record, "041", "a")?.trim();
  }

  // Normalize to ISO 639-1 if possible
  if (langCode) {
    const normalized = normalizeLanguageCode(langCode);
    return normalized || langCode; // Return original if normalization fails
  }

  return undefined;
}

/**
 * Extract subjects from 650, 651, 655 fields
 */
export function extractSubjects(record: MarcRecord): string[] {
  const subjects: string[] = [];
  const subjectTags = ["650", "651", "655"];
  const subjectCodes = ["a", "v", "x", "y", "z"];

  for (const tag of subjectTags) {
    const values = getSubfieldValues(record, tag, subjectCodes);
    for (const value of values) {
      const cleaned = value.replace(/[.]$/, "").trim();
      if (cleaned && !subjects.includes(cleaned)) {
        subjects.push(cleaned);
      }
    }
  }

  return subjects;
}

/**
 * Extract physical description from 300 field
 */
export function extractPhysicalDescription(record: MarcRecord): {
  pageCount?: number | undefined;
  dimensions?: string | undefined;
} {
  const physDescParts = getSubfieldValues(record, "300", ["a", "b", "c"]);
  const physDesc = physDescParts.join(" ");

  let pageCount: number | undefined;
  let dimensions: string | undefined;

  // Extract page count
  // Patterns: "xiv, 345 p.", "345 pages", "345 S." (German), "345 Seiten"
  const pageMatch = physDesc.match(/(\d+)\s*(?:p\.?|pages?|S\.|Seiten)/i);
  if (pageMatch) {
    pageCount = parseInt(pageMatch[1], 10);
  }

  // Extract dimensions
  const dimMatch = physDesc.match(/(\d+)\s*cm/i);
  if (dimMatch) {
    dimensions = `${dimMatch[1]} cm`;
  }

  return { pageCount, dimensions };
}

/**
 * Extract series information from 490 and 830 fields
 */
export function extractSeries(record: MarcRecord): {
  name?: string | undefined;
  position?: string | undefined;
} {
  // Try 490 (series statement) first
  const series490 = getDataField(record, "490");
  if (series490) {
    const name = getSubfield(series490, "a")?.replace(/[;.]$/, "").trim();
    const position = getSubfield(series490, "v");
    if (name) {
      return { name, position };
    }
  }

  // Try 830 (series added entry)
  const series830 = getDataField(record, "830");
  if (series830) {
    const name = getSubfield(series830, "a")?.replace(/[;.]$/, "").trim();
    const position = getSubfield(series830, "v");
    if (name) {
      return { name, position };
    }
  }

  return {};
}

/**
 * Extract GND (German authority) IDs from author fields
 *
 * GND IDs can appear in different formats:
 * - "(DE-588)123456789" - DNB format with DE-588 prefix
 * - "https://d-nb.info/gnd/123456789" - URI format
 * - "(gnd)123456789" - lowercase gnd format
 */
function extractGndIds(record: MarcRecord): string[] | undefined {
  const gndIds: string[] = [];
  const authorTags = ["100", "700", "110", "710"];

  for (const tag of authorTags) {
    const values = getSubfieldValues(record, tag, ["0"]);
    for (const value of values) {
      // Check for various GND ID formats
      if (
        value.includes("gnd") ||
        value.includes("d-nb.info") ||
        value.includes("DE-588")
      ) {
        gndIds.push(value);
      }
    }
  }

  return gndIds.length > 0 ? gndIds : undefined;
}

/**
 * Extract the number of records from an SRU response
 *
 * @param xmlText - SRU response XML
 * @returns Number of records found, or 0 if not found
 */
export function extractSruRecordCount(xmlText: string): number {
  const match = xmlText.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/i);
  return match ? parseInt(match[1], 10) : 0;
}
