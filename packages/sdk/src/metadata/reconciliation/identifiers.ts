import type {
  Conflict,
  Identifier,
  IdentifierInput,
  MetadataSource,
  ReconciledField,
} from "./types.js";

/**
 * Normalizes and validates various types of identifiers (ISBN, OCLC, LCCN, DOI, etc.)
 */
export class IdentifierReconciler {
  /**
   * Normalize an identifier string or object into a standardized Identifier
   */
  normalizeIdentifier(input: string | Identifier, type?: Identifier["type"]): Identifier {
    if (typeof input === "object" && input !== null) {
      return this.validateIdentifier(input);
    }

    const detectedType = type || this.detectIdentifierType(input);
    const normalized = this.normalizeByType(input, detectedType);

    return {
      type: detectedType,
      value: input,
      normalized,
      valid: this.validateByType(normalized, detectedType),
    };
  }

  /**
   * Reconcile multiple identifier inputs using deduplication and validation
   */
  reconcileIdentifiers(inputs: IdentifierInput[]): ReconciledField<Identifier[]> {
    if (inputs.length === 0) {
      throw new Error("No identifiers to reconcile");
    }

    // Collect all identifiers from all inputs
    const allIdentifiers: Array<{ identifier: Identifier; source: MetadataSource }> = [];

    for (const input of inputs) {
      // Process explicit identifiers array
      if (input.identifiers) {
        for (const id of input.identifiers) {
          const normalized = this.normalizeIdentifier(id);
          allIdentifiers.push({ identifier: normalized, source: input.source });
        }
      }

      // Process specific identifier types
      const specificTypes: Array<{ key: keyof IdentifierInput; type: Identifier["type"] }> = [
        { key: "isbn", type: "isbn" },
        { key: "oclc", type: "oclc" },
        { key: "lccn", type: "lccn" },
        { key: "doi", type: "doi" },
        { key: "goodreads", type: "goodreads" },
        { key: "amazon", type: "amazon" },
        { key: "google", type: "google" },
      ];

      for (const { key, type } of specificTypes) {
        const value = input[key];
        if (value) {
          const values = Array.isArray(value) ? value : [value];
          for (const v of values) {
            const normalized = this.normalizeIdentifier(v as string, type);
            allIdentifiers.push({ identifier: normalized, source: input.source });
          }
        }
      }
    }

    if (allIdentifiers.length === 0) {
      return {
        value: [],
        confidence: 0.1,
        sources: inputs.map((i) => i.source),
        reasoning: "No valid identifiers found",
      };
    }

    // Deduplicate identifiers by normalized value and type
    const uniqueIdentifiers = new Map<string, { identifier: Identifier; source: MetadataSource }>();
    const conflicts: Conflict[] = [];

    for (const item of allIdentifiers) {
      const key = `${item.identifier.type}:${item.identifier.normalized || item.identifier.value}`;

      if (!uniqueIdentifiers.has(key)) {
        uniqueIdentifiers.set(key, item);
      } else {
        const existing = uniqueIdentifiers.get(key)!;

        // If sources differ, record as conflict but keep the more reliable source
        if (existing.source.name !== item.source.name) {
          conflicts.push({
            field: `identifier_${item.identifier.type}`,
            values: [
              { value: existing.identifier, source: existing.source },
              { value: item.identifier, source: item.source },
            ],
            resolution: "Kept identifier from more reliable source",
          });

          if (item.source.reliability > existing.source.reliability) {
            uniqueIdentifiers.set(key, item);
          }
        }
      }
    }

    // Sort identifiers by type priority and validity
    const typePriority: Record<Identifier["type"], number> = {
      isbn: 10,
      doi: 9,
      oclc: 8,
      lccn: 7,
      amazon: 6,
      goodreads: 5,
      google: 4,
      other: 1,
    };

    const sortedIdentifiers = Array.from(uniqueIdentifiers.values()).sort((a, b) => {
      // Sort by validity first
      if (a.identifier.valid !== b.identifier.valid) {
        return (b.identifier.valid ? 1 : 0) - (a.identifier.valid ? 1 : 0);
      }

      // Then by type priority
      const priorityDiff = typePriority[b.identifier.type] - typePriority[a.identifier.type];
      if (priorityDiff !== 0) return priorityDiff;

      // Finally by source reliability
      return b.source.reliability - a.source.reliability;
    });

    // Calculate confidence based on validity and source reliability
    const validCount = sortedIdentifiers.filter((item) => item.identifier.valid).length;
    const totalCount = sortedIdentifiers.length;
    const avgReliability =
      sortedIdentifiers.reduce((sum, item) => sum + item.source.reliability, 0) / totalCount;

    const confidence = Math.min(1, (validCount / totalCount) * avgReliability * 0.9 + 0.1);

    return {
      value: sortedIdentifiers.map((item) => item.identifier),
      confidence,
      sources: Array.from(new Set(sortedIdentifiers.map((item) => item.source))),
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      reasoning:
        conflicts.length > 0
          ? `Reconciled ${totalCount} identifiers with ${conflicts.length} conflicts, ${validCount} valid`
          : `Reconciled ${totalCount} identifiers, ${validCount} valid`,
    };
  }

  /**
   * Detect the type of identifier from its format
   */
  private detectIdentifierType(value: string): Identifier["type"] {
    const cleaned = value.replace(/[\s-]/g, "");

    // DOI patterns (check before ISBN since DOI is more specific)
    if (/^10\.\d{4,}\//.test(value) || /^doi:/i.test(value) || value.includes("doi.org")) {
      return "doi";
    }

    // ISBN patterns
    if (/^97\d{11}$/.test(cleaned) || /^\d{9}[\dX]$/.test(cleaned)) {
      return "isbn";
    }

    // GoodReads patterns (check URLs first)
    if (/^goodreads:/i.test(value) || value.includes("goodreads.com")) {
      return "goodreads";
    }

    // Amazon ASIN patterns (check URLs first)
    if (/^amazon:/i.test(value) || value.includes("amazon.com") || /^[A-Z0-9]{10}$/.test(cleaned)) {
      return "amazon";
    }

    // Google Books patterns
    if (/^google:/i.test(value) || value.includes("books.google.com")) {
      return "google";
    }

    // OCLC patterns (typically 8-10 digits)
    if (/^(ocm|ocn|on)?\d{8,10}$/.test(cleaned.toLowerCase())) {
      return "oclc";
    }

    // LCCN patterns (more flexible)
    if (/^\d{10,11}$/.test(cleaned) || /^[a-z]{1,3}\d{8,10}$/.test(cleaned.toLowerCase())) {
      return "lccn";
    }

    // Fallback for numeric IDs that could be GoodReads
    if (/^\d{7,10}$/.test(cleaned)) {
      return "goodreads";
    }

    return "other";
  }

  /**
   * Normalize identifier value based on its type
   */
  private normalizeByType(value: string, type: Identifier["type"]): string {
    switch (type) {
      case "isbn":
        return this.normalizeISBN(value);
      case "doi":
        return this.normalizeDOI(value);
      case "oclc":
        return this.normalizeOCLC(value);
      case "lccn":
        return this.normalizeLCCN(value);
      case "goodreads":
        return this.normalizeGoodReads(value);
      case "amazon":
        return this.normalizeAmazon(value);
      case "google":
        return this.normalizeGoogle(value);
      default:
        return value.trim();
    }
  }

  /**
   * Normalize ISBN (convert to ISBN-13 format)
   */
  private normalizeISBN(isbn: string): string {
    const cleaned = isbn.replace(/[\s-]/g, "");

    // If it's already ISBN-13, return as-is (validation happens separately)
    if (cleaned.length === 13) {
      return cleaned;
    }

    // Convert ISBN-10 to ISBN-13
    if (cleaned.length === 10) {
      // Handle ISBN-10 with X check digit
      const isbn10Base = cleaned.slice(0, 9);
      const prefix = "978";
      const isbn13Base = prefix + isbn10Base;

      // Calculate check digit for ISBN-13
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(isbn13Base[i], 10);
        sum += digit * (i % 2 === 0 ? 1 : 3);
      }
      const checkDigit = (10 - (sum % 10)) % 10;

      return isbn13Base + checkDigit.toString();
    }

    return cleaned;
  }

  /**
   * Normalize DOI
   */
  private normalizeDOI(doi: string): string {
    // Remove common prefixes and normalize
    let normalized = doi.trim();
    normalized = normalized.replace(/^(doi:|DOI:)/i, "");
    normalized = normalized.replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
    return normalized;
  }

  /**
   * Normalize OCLC number
   */
  private normalizeOCLC(oclc: string): string {
    let normalized = oclc.replace(/[\s-]/g, "");
    normalized = normalized.replace(/^(ocm|ocn|on)/i, "");
    return normalized;
  }

  /**
   * Normalize LCCN
   */
  private normalizeLCCN(lccn: string): string {
    // Remove spaces and hyphens, keep letters and numbers
    return lccn.replace(/[\s-]/g, "").toLowerCase();
  }

  /**
   * Normalize GoodReads identifier
   */
  private normalizeGoodReads(goodreads: string): string {
    let normalized = goodreads.replace(/^goodreads:/i, "");
    normalized = normalized.replace(/.*\/show\/(\d+).*/, "$1");
    return normalized.replace(/\D/g, "");
  }

  /**
   * Normalize Amazon identifier (ASIN)
   */
  private normalizeAmazon(amazon: string): string {
    let normalized = amazon.replace(/^amazon:/i, "");
    normalized = normalized.replace(/.*\/dp\/([A-Z0-9]{10}).*/, "$1");
    normalized = normalized.replace(/.*\/gp\/product\/([A-Z0-9]{10}).*/, "$1");
    return normalized.toUpperCase();
  }

  /**
   * Normalize Google Books identifier
   */
  private normalizeGoogle(google: string): string {
    let normalized = google.replace(/^google:/i, "");
    normalized = normalized.replace(/.*books\.google\.com.*[?&]id=([^&]+).*/, "$1");
    return normalized;
  }

  /**
   * Validate identifier based on its type
   */
  private validateByType(value: string, type: Identifier["type"]): boolean {
    switch (type) {
      case "isbn":
        return this.validateISBN(value);
      case "doi":
        return this.validateDOI(value);
      case "oclc":
        return this.validateOCLC(value);
      case "lccn":
        return this.validateLCCN(value);
      case "goodreads":
        return /^\d{7,10}$/.test(value);
      case "amazon":
        return /^[A-Z0-9]{10}$/.test(value);
      case "google":
        return value.length > 0;
      default:
        return value.length > 0;
    }
  }

  /**
   * Validate ISBN-13 using check digit
   */
  private validateISBN(isbn: string): boolean {
    if (isbn.length !== 13 || !/^\d{13}$/.test(isbn)) {
      return false;
    }

    if (!isbn.startsWith("978") && !isbn.startsWith("979")) {
      return false;
    }

    // Validate check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(isbn[i], 10);
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;

    return checkDigit === parseInt(isbn[12], 10);
  }

  /**
   * Validate DOI format
   */
  private validateDOI(doi: string): boolean {
    return /^10\.\d{4,}\/\S+$/.test(doi);
  }

  /**
   * Validate OCLC number
   */
  private validateOCLC(oclc: string): boolean {
    return /^\d{8,10}$/.test(oclc);
  }

  /**
   * Validate LCCN format
   */
  private validateLCCN(lccn: string): boolean {
    // LCCN can be various formats, be lenient
    return /^[a-z]{0,3}\d{8,10}$/.test(lccn) || /^\d{10,11}$/.test(lccn);
  }

  /**
   * Validate and normalize an Identifier object
   */
  private validateIdentifier(identifier: Identifier): Identifier {
    const normalized = this.normalizeByType(identifier.value, identifier.type);
    const valid = this.validateByType(normalized, identifier.type);

    return { ...identifier, normalized, valid };
  }
}
