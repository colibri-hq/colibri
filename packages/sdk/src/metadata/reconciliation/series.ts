import type {
  Collection,
  CollectionContent,
  CollectionInput,
  Edition,
  MetadataSource,
  ReconciledCollection,
  ReconciledField,
  ReconciledSeries,
  ReconciledWorkEdition,
  RelatedWork,
  Series,
  SeriesInput,
  Work,
  WorkEditionInput,
} from "./types.js";

/**
 * Reconciles series information, work-to-edition relationships, and collection data
 */
export class SeriesReconciler {
  // Common series name variations and normalizations
  private readonly seriesNormalizations = new Map([
    // Common abbreviations and variations
    ["vol.", "volume"],
    ["vol", "volume"],
    ["v.", "volume"],
    ["bk.", "book"],
    ["bk", "book"],
    ["pt.", "part"],
    ["pt", "part"],
    ["no.", "number"],
    ["no", "number"],
    ["#", "number"],
    ["ser.", "series"],
    ["ser", "series"],

    // Ordinal numbers
    ["1st", "1"],
    ["2nd", "2"],
    ["3rd", "3"],
    ["4th", "4"],
    ["5th", "5"],
    ["6th", "6"],
    ["7th", "7"],
    ["8th", "8"],
    ["9th", "9"],
    ["10th", "10"],
    ["first", "1"],
    ["second", "2"],
    ["third", "3"],
    ["fourth", "4"],
    ["fifth", "5"],
    ["sixth", "6"],
    ["seventh", "7"],
    ["eighth", "8"],
    ["ninth", "9"],
    ["tenth", "10"],

    // Roman numerals
    ["i", "1"],
    ["ii", "2"],
    ["iii", "3"],
    ["iv", "4"],
    ["v", "5"],
    ["vi", "6"],
    ["vii", "7"],
    ["viii", "8"],
    ["ix", "9"],
    ["x", "10"],
  ]);

  // Patterns for extracting series information
  private readonly seriesPatterns = [
    // "Series Name, Book 1" or "Series Name, Volume 1"
    /^(.+?),\s*(?:book|vol\.?|volume|part|pt\.?|no\.?|number|#)\s*(\d+|[ivx]+)$/i,
    // "Series Name #1" or "Series Name Vol. 1"
    /^(.+?)\s+(?:#|vol\.?|volume|book|bk\.?|part|pt\.?|no\.?|number)\s*(\d+|[ivx]+)$/i,
    // "Series Name (Book 1)" or "Series Name (Volume 1)"
    /^(.+?)\s*\((?:book|vol\.?|volume|part|pt\.?|no\.?|number|#)\s*(\d+|[ivx]+)\)$/i,
    // "Book 1 of Series Name" or "Volume 1 of Series Name" - swap capture groups
    /^(?:book|vol\.?|volume|part|pt\.?|no\.?|number|#)\s*(\d+|[ivx]+)\s+of\s+(.+)$/i,
    // "Series Name Second Book" - handle ordinal words
    /^(.+?)\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(?:st|nd|rd|th))\s+(?:book|volume|part)$/i,
    // "Series Name, 1st Edition" - handle editions with ordinals
    /^(.+?),\s*(\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+edition$/i,
    // "Series Name: Book Title" (extract series name only)
    /^(.+?):\s*.+$/,
    // Just the series name without volume info
    /^(.+)$/,
  ];

  // Relationship type mappings
  private readonly relationshipMappings = new Map([
    [
      "sequel",
      ["sequel", "continuation", "follows", "next", "book 2", "part 2"],
    ],
    ["prequel", ["prequel", "precedes", "before", "origin", "backstory"]],
    [
      "companion",
      ["companion", "related", "spin-off", "spinoff", "side story"],
    ],
    [
      "adaptation",
      ["adaptation", "adapted from", "based on", "movie tie-in", "tv tie-in"],
    ],
    ["translation", ["translation", "translated from", "translated by"]],
    ["revision", ["revision", "revised", "updated", "new edition", "expanded"]],
    [
      "anthology_contains",
      ["contains", "includes", "anthology of", "collection of"],
    ],
    ["collection_contains", ["collected in", "part of collection", "omnibus"]],
    ["part_of", ["part of", "volume in", "book in series"]],
  ]);

  /**
   * Reconcile series information from multiple sources
   */
  reconcileSeries(inputs: SeriesInput[]): ReconciledSeries {
    if (inputs.length === 0) {
      throw new Error("No series inputs to reconcile");
    }

    // Flatten and normalize all series
    const allSeries: { series: Series; source: MetadataSource }[] = [];

    for (const input of inputs) {
      if (!input.series || input.series.length === 0) continue;

      for (const seriesInput of input.series) {
        const normalized = this.normalizeSeries(seriesInput);
        if (normalized.name && normalized.name.trim().length > 0) {
          allSeries.push({
            series: normalized,
            source: input.source,
          });
        }
      }
    }

    if (allSeries.length === 0) {
      return {
        series: {
          value: [],
          confidence: 0.1,
          sources: inputs.map((input) => input.source),
          reasoning: "No valid series information found",
        },
      };
    }

    // Group similar series together
    const seriesGroups = this.groupSimilarSeries(allSeries);

    // Reconcile each group
    const reconciledSeries: Series[] = [];
    for (const group of seriesGroups) {
      const reconciled = this.reconcileSeriesGroup(group);
      reconciledSeries.push(reconciled);
    }

    // Sort by volume number if available, then by name
    reconciledSeries.sort((a, b) => {
      if (a.volume !== undefined && b.volume !== undefined) {
        const aVol =
          typeof a.volume === "number"
            ? a.volume
            : parseInt(String(a.volume), 10);
        const bVol =
          typeof b.volume === "number"
            ? b.volume
            : parseInt(String(b.volume), 10);
        if (!isNaN(aVol) && !isNaN(bVol)) {
          return aVol - bVol;
        }
      }
      return (a.normalized || a.name).localeCompare(b.normalized || b.name);
    });

    const confidence = this.calculateSeriesConfidence(
      reconciledSeries,
      inputs.map((input) => input.source),
    );

    return {
      series: {
        value: reconciledSeries,
        confidence,
        sources: inputs.map((input) => input.source),
        reasoning: `Reconciled ${reconciledSeries.length} series from ${inputs.length} sources`,
      },
    };
  }

  /**
   * Reconcile work and edition relationships
   */
  reconcileWorkEdition(inputs: WorkEditionInput[]): ReconciledWorkEdition {
    if (inputs.length === 0) {
      throw new Error("No work/edition inputs to reconcile");
    }

    // Extract works, editions, and related works
    const works = inputs
      .filter((input) => input.work)
      .map((input) => ({ work: input.work!, source: input.source }));
    const editions = inputs
      .filter((input) => input.edition)
      .map((input) => ({ edition: input.edition!, source: input.source }));
    const allRelatedWorks = inputs.flatMap((input) =>
      (input.relatedWorks || []).map((rw) => ({
        relatedWork: rw,
        source: input.source,
      })),
    );

    // Reconcile work
    const reconciledWork = this.reconcileWork(works);

    // Reconcile edition
    const reconciledEdition = this.reconcileEdition(
      editions,
      reconciledWork.value,
    );

    // Reconcile related works
    const reconciledRelatedWorks = this.reconcileRelatedWorks(allRelatedWorks);

    return {
      work: reconciledWork,
      edition: reconciledEdition,
      relatedWorks: reconciledRelatedWorks,
    };
  }

  /**
   * Reconcile collection information
   */
  reconcileCollections(inputs: CollectionInput[]): ReconciledCollection {
    if (inputs.length === 0) {
      throw new Error("No collection inputs to reconcile");
    }

    // Extract collections and contents
    const allCollections = inputs.flatMap((input) =>
      (input.collections || []).map((c) => ({
        collection: this.normalizeCollection(c),
        source: input.source,
      })),
    );

    const allContents = inputs.flatMap((input) =>
      (input.collectionContents || []).map((c) => ({
        content: c,
        source: input.source,
      })),
    );

    // Reconcile collections
    const reconciledCollections = this.reconcileCollectionList(allCollections);

    // Reconcile contents
    const reconciledContents = this.reconcileCollectionContents(allContents);

    return {
      collections: reconciledCollections,
      collectionContents: reconciledContents,
    };
  }

  /**
   * Normalize a series name by removing common variations and standardizing format
   */
  private normalizeSeriesName(name: string): string {
    if (!name || typeof name !== "string") {
      return "";
    }

    let normalized = name.trim();

    // Remove common prefixes and suffixes
    normalized = normalized
      .replace(/^(the\s+|a\s+|an\s+)/i, "") // Remove articles
      .replace(/\s+series$/i, "") // Remove "Series" suffix
      .replace(/\s+saga$/i, "") // Remove "Saga" suffix
      .replace(/\s+cycle$/i, "") // Remove "Cycle" suffix
      .replace(/[^\w\s\-&']/g, " ") // Replace special characters with spaces except common ones
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    return normalized.toLowerCase();
  }

  /**
   * Extract series information from a string using various patterns
   */
  private extractSeriesInfo(input: string): {
    name: string;
    volume?: number | undefined;
    raw: string;
  } {
    if (!input || typeof input !== "string") {
      return { name: "", raw: input };
    }

    const trimmed = input.trim();

    for (let i = 0; i < this.seriesPatterns.length; i++) {
      const pattern = this.seriesPatterns[i];
      const match = trimmed.match(pattern);
      if (match) {
        if (match.length === 3) {
          // Handle different patterns - some have volume first, some have series name first
          let seriesName: string;
          let volumeStr: string;

          // Check if this is the "Book X of Series" pattern (4th pattern, index 3)
          if (i === 3) {
            // Volume is first capture group, series name is second
            volumeStr = match[1].toLowerCase().trim();
            seriesName = match[2].trim();
          } else {
            // Series name is first capture group, volume is second
            seriesName = match[1].trim();
            volumeStr = match[2].toLowerCase().trim();
          }

          const volume = this.parseVolumeNumber(volumeStr);

          return {
            name: seriesName,
            volume,
            raw: trimmed,
          };
        } else if (match.length === 2) {
          // Pattern with just series name
          return {
            name: match[1].trim(),
            raw: trimmed,
          };
        }
      }
    }

    // If no pattern matches, treat the entire string as series name
    return {
      name: trimmed,
      raw: trimmed,
    };
  }

  /**
   * Parse volume number from string, handling various formats
   */
  private parseVolumeNumber(volumeStr: string): number | undefined {
    if (!volumeStr) return undefined;

    const normalized = volumeStr.toLowerCase().trim();

    // Check for direct normalization mapping
    if (this.seriesNormalizations.has(normalized)) {
      const mapped = this.seriesNormalizations.get(normalized)!;
      const num = parseInt(mapped, 10);
      if (!isNaN(num)) return num;
    }

    // Try to parse as number directly
    const num = parseInt(normalized, 10);
    if (!isNaN(num)) return num;

    // Handle roman numerals
    const romanValue = this.parseRomanNumeral(normalized);
    if (romanValue > 0) return romanValue;

    return undefined;
  }

  /**
   * Parse roman numerals (basic implementation for common cases)
   */
  private parseRomanNumeral(roman: string): number {
    const romanMap: { [key: string]: number } = {
      i: 1,
      ii: 2,
      iii: 3,
      iv: 4,
      v: 5,
      vi: 6,
      vii: 7,
      viii: 8,
      ix: 9,
      x: 10,
      xi: 11,
      xii: 12,
      xiii: 13,
      xiv: 14,
      xv: 15,
      xvi: 16,
      xvii: 17,
      xviii: 18,
      xix: 19,
      xx: 20,
    };

    return romanMap[roman.toLowerCase()] || 0;
  }

  /**
   * Normalize a series object
   */
  private normalizeSeries(input: string | Series): Series {
    if (typeof input === "string") {
      const extracted = this.extractSeriesInfo(input);
      return {
        name: extracted.name,
        normalized: this.normalizeSeriesName(extracted.name),
        volume: extracted.volume,
        raw: extracted.raw,
        seriesType: this.detectSeriesType(extracted.name, extracted.volume),
      };
    }

    return {
      name: input.name,
      normalized: input.normalized || this.normalizeSeriesName(input.name),
      volume: input.volume,
      position: input.position,
      totalVolumes: input.totalVolumes,
      seriesType:
        input.seriesType || this.detectSeriesType(input.name, input.volume),
      description: input.description,
      identifiers: input.identifiers,
      raw: input.raw || input.name,
    };
  }

  /**
   * Detect series type based on name and volume information
   */
  private detectSeriesType(
    name: string,
    volume?: number | string,
  ): Series["seriesType"] {
    const lowerName = name.toLowerCase();

    if (lowerName.includes("anthology")) {
      return "anthology";
    }

    if (
      lowerName.includes("collection") ||
      lowerName.includes("omnibus") ||
      lowerName.includes("complete")
    ) {
      return "collection";
    }

    if (volume !== undefined) {
      return "numbered";
    }

    if (
      lowerName.includes("chronicles") ||
      lowerName.includes("saga") ||
      lowerName.includes("cycle")
    ) {
      return "chronological";
    }

    return "unknown";
  }

  /**
   * Calculate similarity between two series names
   */
  private calculateSeriesSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;

    const normalized1 = this.normalizeSeriesName(name1);
    const normalized2 = this.normalizeSeriesName(name2);

    if (normalized1 === normalized2) return 1;

    // Use Levenshtein distance for similarity
    return this.calculateLevenshteinSimilarity(normalized1, normalized2);
  }

  /**
   * Calculate Levenshtein similarity between two strings
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix = Array(len2 + 1)
      .fill(null)
      .map(() => Array(len1 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1, // deletion
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i - 1] + cost, // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len2][len1]) / maxLen;
  }

  /**
   * Group similar series together for reconciliation
   */
  private groupSimilarSeries(
    allSeries: { series: Series; source: MetadataSource }[],
  ): { series: Series; source: MetadataSource }[][] {
    const groups: { series: Series; source: MetadataSource }[][] = [];

    for (const item of allSeries) {
      let addedToGroup = false;

      for (const group of groups) {
        // Check if this series is similar to any in the existing group
        const similarity = this.calculateSeriesSimilarity(
          item.series.name,
          group[0].series.name,
        );
        if (similarity > 0.8) {
          group.push(item);
          addedToGroup = true;
          break;
        }
      }

      if (!addedToGroup) {
        groups.push([item]);
      }
    }

    return groups;
  }

  /**
   * Reconcile a group of similar series
   */
  private reconcileSeriesGroup(
    group: { series: Series; source: MetadataSource }[],
  ): Series {
    if (group.length === 1) {
      return group[0].series;
    }

    // Sort by source reliability
    const sorted = group.toSorted(
      (a, b) => b.source.reliability - a.source.reliability,
    );
    const primary = sorted[0].series;

    // Merge information from all sources
    const merged: Series = {
      name: primary.name,
      normalized: primary.normalized,
      volume: primary.volume,
      position: primary.position,
      totalVolumes: primary.totalVolumes,
      seriesType: primary.seriesType,
      description: primary.description,
      identifiers: primary.identifiers ? [...primary.identifiers] : [],
      raw: primary.raw,
    };

    // Merge additional information from other sources
    for (let i = 1; i < sorted.length; i++) {
      const other = sorted[i].series;

      // Use more specific volume information if available
      if (!merged.volume && other.volume) {
        merged.volume = other.volume;
      }

      // Use position if not set
      if (!merged.position && other.position) {
        merged.position = other.position;
      }

      // Use total volumes if not set
      if (!merged.totalVolumes && other.totalVolumes) {
        merged.totalVolumes = other.totalVolumes;
      }

      // Use more specific series type
      if (merged.seriesType === "unknown" && other.seriesType !== "unknown") {
        merged.seriesType = other.seriesType;
      }

      // Use description if not set
      if (!merged.description && other.description) {
        merged.description = other.description;
      }

      // Merge identifiers
      if (other.identifiers) {
        for (const identifier of other.identifiers) {
          if (
            !merged.identifiers!.some(
              (id) =>
                id.type === identifier.type && id.value === identifier.value,
            )
          ) {
            merged.identifiers!.push(identifier);
          }
        }
      }
    }

    return merged;
  }

  /**
   * Calculate confidence score for reconciled series
   */
  private calculateSeriesConfidence(
    series: Series[],
    sources: MetadataSource[],
  ): number {
    if (series.length === 0) return 0.1;

    // Base confidence from source reliability
    const avgSourceReliability =
      sources.reduce((sum, source) => sum + source.reliability, 0) /
      sources.length;
    let confidence = avgSourceReliability;

    // Adjust based on completeness of series information
    const completenessScore =
      series.reduce((sum, s) => {
        let score = 0.2; // Base score for having a name
        if (s.volume !== undefined) score += 0.2;
        if (s.seriesType && s.seriesType !== "unknown") score += 0.2;
        if (s.totalVolumes) score += 0.2;
        if (s.identifiers && s.identifiers.length > 0) score += 0.2;
        return sum + score;
      }, 0) / series.length;

    confidence *= completenessScore;

    return Math.max(0.1, Math.min(1, confidence));
  }

  /**
   * Reconcile work information
   */
  private reconcileWork(
    works: { work: Work; source: MetadataSource }[],
  ): ReconciledField<Work> {
    if (works.length === 0) {
      return {
        value: { title: "", type: "other" },
        confidence: 0.1,
        sources: [],
        reasoning: "No work information available",
      };
    }

    // Sort by source reliability
    const sorted = works.toSorted(
      (a, b) => b.source.reliability - a.source.reliability,
    );
    const primary = sorted[0].work;

    // Merge information from all sources
    const merged: Work = {
      id: primary.id,
      title: primary.title,
      normalized: primary.normalized || this.normalizeTitle(primary.title),
      type: primary.type || "other",
      originalLanguage: primary.originalLanguage,
      firstPublished: primary.firstPublished,
      authors: primary.authors ? [...primary.authors] : [],
      identifiers: primary.identifiers ? [...primary.identifiers] : [],
    };

    // Merge additional information
    for (let i = 1; i < sorted.length; i++) {
      const other = sorted[i].work;

      if (!merged.type || merged.type === "other") {
        merged.type = other.type || "other";
      }

      if (!merged.originalLanguage && other.originalLanguage) {
        merged.originalLanguage = other.originalLanguage;
      }

      if (!merged.firstPublished && other.firstPublished) {
        merged.firstPublished = other.firstPublished;
      }

      // Merge authors
      if (other.authors) {
        for (const author of other.authors) {
          if (!merged.authors!.includes(author)) {
            merged.authors!.push(author);
          }
        }
      }

      // Merge identifiers
      if (other.identifiers) {
        for (const identifier of other.identifiers) {
          if (
            !merged.identifiers!.some(
              (id) =>
                id.type === identifier.type && id.value === identifier.value,
            )
          ) {
            merged.identifiers!.push(identifier);
          }
        }
      }
    }

    const confidence = this.calculateWorkConfidence(
      merged,
      sorted.map((w) => w.source),
    );

    return {
      value: merged,
      confidence,
      sources: sorted.map((w) => w.source),
      reasoning: `Reconciled work from ${sorted.length} sources`,
    };
  }

  /**
   * Normalize a title for comparison
   */
  private normalizeTitle(title: string): string {
    if (!title) return "";

    return title
      .toLowerCase()
      .replace(/^(the\s+|a\s+|an\s+)/i, "")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Calculate confidence for work reconciliation
   */
  private calculateWorkConfidence(
    work: Work,
    sources: MetadataSource[],
  ): number {
    const avgReliability =
      sources.reduce((sum, s) => sum + s.reliability, 0) / sources.length;

    let completeness = 0.2; // Base for having a title
    if (work.type && work.type !== "other") completeness += 0.2;
    if (work.authors && work.authors.length > 0) completeness += 0.2;
    if (work.firstPublished) completeness += 0.2;
    if (work.identifiers && work.identifiers.length > 0) completeness += 0.2;

    return Math.max(0.1, Math.min(1, avgReliability * completeness));
  }

  /**
   * Reconcile edition information
   */
  private reconcileEdition(
    editions: { edition: Edition; source: MetadataSource }[],
    work: Work,
  ): ReconciledField<Edition> {
    if (editions.length === 0) {
      return {
        value: { workId: work.id },
        confidence: 0.1,
        sources: [],
        reasoning: "No edition information available",
      };
    }

    const sorted = editions.toSorted(
      (a, b) => b.source.reliability - a.source.reliability,
    );
    const primary = sorted[0].edition;

    const merged: Edition = {
      id: primary.id,
      workId: primary.workId || work.id,
      title: primary.title,
      format: primary.format,
      language: primary.language,
      publicationDate: primary.publicationDate,
      publisher: primary.publisher,
      isbn: primary.isbn ? [...primary.isbn] : [],
      pageCount: primary.pageCount,
      identifiers: primary.identifiers ? [...primary.identifiers] : [],
    };

    // Merge from other sources
    for (let i = 1; i < sorted.length; i++) {
      const other = sorted[i].edition;

      if (!merged.format && other.format) merged.format = other.format;
      if (!merged.language && other.language) merged.language = other.language;
      if (!merged.publicationDate && other.publicationDate)
        merged.publicationDate = other.publicationDate;
      if (!merged.publisher && other.publisher)
        merged.publisher = other.publisher;
      if (!merged.pageCount && other.pageCount)
        merged.pageCount = other.pageCount;

      // Merge ISBNs
      if (other.isbn) {
        for (const isbn of other.isbn) {
          if (!merged.isbn!.includes(isbn)) {
            merged.isbn!.push(isbn);
          }
        }
      }

      // Merge identifiers
      if (other.identifiers) {
        for (const identifier of other.identifiers) {
          if (
            !merged.identifiers!.some(
              (id) =>
                id.type === identifier.type && id.value === identifier.value,
            )
          ) {
            merged.identifiers!.push(identifier);
          }
        }
      }
    }

    const confidence = this.calculateEditionConfidence(
      merged,
      sorted.map((e) => e.source),
    );

    return {
      value: merged,
      confidence,
      sources: sorted.map((e) => e.source),
      reasoning: `Reconciled edition from ${sorted.length} sources`,
    };
  }

  /**
   * Calculate confidence for edition reconciliation
   */
  private calculateEditionConfidence(
    edition: Edition,
    sources: MetadataSource[],
  ): number {
    const avgReliability =
      sources.reduce((sum, s) => sum + s.reliability, 0) / sources.length;

    let completeness = 0.1; // Base score
    if (edition.format) completeness += 0.15;
    if (edition.language) completeness += 0.15;
    if (edition.publicationDate) completeness += 0.2;
    if (edition.publisher) completeness += 0.15;
    if (edition.isbn && edition.isbn.length > 0) completeness += 0.15;
    if (edition.pageCount) completeness += 0.1;

    return Math.max(0.1, Math.min(1, avgReliability * completeness));
  }

  /**
   * Reconcile related works
   */
  private reconcileRelatedWorks(
    relatedWorks: { relatedWork: RelatedWork; source: MetadataSource }[],
  ): ReconciledField<RelatedWork[]> {
    if (relatedWorks.length === 0) {
      return {
        value: [],
        confidence: 0.1,
        sources: [],
        reasoning: "No related works information available",
      };
    }

    // Group by relationship type and similar titles
    const grouped = new Map<
      string,
      { relatedWork: RelatedWork; source: MetadataSource }[]
    >();

    for (const item of relatedWorks) {
      const normalizedTitle = this.normalizeTitle(item.relatedWork.title);
      let foundGroup = false;

      // Check if this work is similar to any existing group
      for (const [key, group] of grouped.entries()) {
        const [existingType, existingTitle] = key.split(":");
        if (existingType === item.relatedWork.relationshipType) {
          const similarity = this.calculateLevenshteinSimilarity(
            normalizedTitle,
            existingTitle,
          );
          if (similarity > 0.6) {
            // Similar titles with same relationship type
            group.push(item);
            foundGroup = true;
            break;
          }
        }
      }

      if (!foundGroup) {
        const key = `${item.relatedWork.relationshipType}:${normalizedTitle}`;
        grouped.set(key, [item]);
      }
    }

    // Reconcile each group
    const reconciled: RelatedWork[] = [];
    for (const group of grouped.values()) {
      const sorted = group.toSorted(
        (a, b) => b.source.reliability - a.source.reliability,
      );
      const primary = sorted[0].relatedWork;

      // Calculate average confidence
      const avgConfidence =
        group.reduce(
          (sum, item) => sum + (item.relatedWork.confidence || 0.5),
          0,
        ) / group.length;

      reconciled.push({
        ...primary,
        confidence: avgConfidence,
        source: sorted[0].source.name,
      });
    }

    const confidence = this.calculateRelatedWorksConfidence(
      reconciled,
      relatedWorks.map((rw) => rw.source),
    );

    return {
      value: reconciled,
      confidence,
      sources: relatedWorks.map((rw) => rw.source),
      reasoning: `Reconciled ${reconciled.length} related works from ${relatedWorks.length} sources`,
    };
  }

  /**
   * Calculate confidence for related works
   */
  private calculateRelatedWorksConfidence(
    relatedWorks: RelatedWork[],
    sources: MetadataSource[],
  ): number {
    if (relatedWorks.length === 0) return 0.1;

    const avgSourceReliability =
      sources.reduce((sum, s) => sum + s.reliability, 0) / sources.length;
    const avgWorkConfidence =
      relatedWorks.reduce((sum, rw) => sum + (rw.confidence || 0.5), 0) /
      relatedWorks.length;

    return Math.max(0.1, Math.min(1, avgSourceReliability * avgWorkConfidence));
  }

  /**
   * Normalize collection input
   */
  private normalizeCollection(input: string | Collection): Collection {
    if (typeof input === "string") {
      return {
        name: input,
        normalized: this.normalizeCollectionName(input),
        type: this.detectCollectionType(input),
      };
    }

    return {
      ...input,
      normalized: input.normalized || this.normalizeCollectionName(input.name),
    };
  }

  /**
   * Normalize collection name
   */
  private normalizeCollectionName(name: string): string {
    if (!name) return "";

    return name
      .toLowerCase()
      .replace(/^(the\s+|a\s+|an\s+)/i, "")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Detect collection type from name
   */
  private detectCollectionType(name: string): Collection["type"] {
    const lower = name.toLowerCase();

    if (lower.includes("anthology")) return "anthology";
    if (lower.includes("omnibus")) return "omnibus";
    if (lower.includes("series") && lower.includes("collection"))
      return "series_collection";
    if (lower.includes("collection")) return "collection";

    return "other";
  }

  /**
   * Reconcile list of collections
   */
  private reconcileCollectionList(
    collections: { collection: Collection; source: MetadataSource }[],
  ): ReconciledField<Collection[]> {
    if (collections.length === 0) {
      return {
        value: [],
        confidence: 0.1,
        sources: [],
        reasoning: "No collection information available",
      };
    }

    // Group similar collections
    const groups = this.groupSimilarCollections(collections);
    const reconciled: Collection[] = [];

    for (const group of groups) {
      const sorted = group.toSorted(
        (a, b) => b.source.reliability - a.source.reliability,
      );
      const primary = sorted[0].collection;

      // Merge information - prefer the most complete name (longest one)
      const allNames = group.map((g) => g.collection.name);
      const longestName = allNames.reduce(
        (longest, current) =>
          current.length > longest.length ? current : longest,
        primary.name,
      );

      // Find the collection with the most specific type (not 'other')
      const bestType =
        group.find((g) => g.collection.type !== "other")?.collection.type ||
        primary.type;

      const merged: Collection = {
        name: longestName,
        normalized: this.normalizeCollectionName(longestName),
        type: bestType,
        contents: primary.contents ? [...primary.contents] : [],
        editors: primary.editors ? [...primary.editors] : [],
        description: primary.description,
        totalWorks: primary.totalWorks,
      };

      // Merge from other sources
      for (let i = 1; i < sorted.length; i++) {
        const other = sorted[i].collection;

        if (!merged.description && other.description)
          merged.description = other.description;
        if (!merged.totalWorks && other.totalWorks)
          merged.totalWorks = other.totalWorks;

        // Merge editors
        if (other.editors) {
          for (const editor of other.editors) {
            if (!merged.editors!.includes(editor)) {
              merged.editors!.push(editor);
            }
          }
        }

        // Merge contents
        if (other.contents) {
          for (const content of other.contents) {
            if (
              !merged.contents!.some(
                (c) =>
                  this.normalizeTitle(c.title) ===
                  this.normalizeTitle(content.title),
              )
            ) {
              merged.contents!.push(content);
            }
          }
        }
      }

      reconciled.push(merged);
    }

    const confidence = this.calculateCollectionConfidence(
      reconciled,
      collections.map((c) => c.source),
    );

    return {
      value: reconciled,
      confidence,
      sources: collections.map((c) => c.source),
      reasoning: `Reconciled ${reconciled.length} collections from ${collections.length} sources`,
    };
  }

  /**
   * Group similar collections
   */
  private groupSimilarCollections(
    collections: { collection: Collection; source: MetadataSource }[],
  ): { collection: Collection; source: MetadataSource }[][] {
    const groups: { collection: Collection; source: MetadataSource }[][] = [];

    for (const item of collections) {
      let addedToGroup = false;

      for (const group of groups) {
        const similarity = this.calculateLevenshteinSimilarity(
          item.collection.normalized || item.collection.name,
          group[0].collection.normalized || group[0].collection.name,
        );

        if (similarity > 0.8) {
          group.push(item);
          addedToGroup = true;
          break;
        }
      }

      if (!addedToGroup) {
        groups.push([item]);
      }
    }

    return groups;
  }

  /**
   * Calculate collection confidence
   */
  private calculateCollectionConfidence(
    collections: Collection[],
    sources: MetadataSource[],
  ): number {
    if (collections.length === 0) return 0.1;

    const avgReliability =
      sources.reduce((sum, { reliability }) => sum + reliability, 0) /
      sources.length;

    const avgCompleteness =
      collections.reduce((sum, { contents, description, editors, type }) => {
        // Base for name
        let score = 0.2;

        if (type !== "other") {
          score += 0.2;
        }

        if (contents && contents.length > 0) {
          score += 0.3;
        }

        if (editors && editors.length > 0) {
          score += 0.15;
        }

        if (description) {
          score += 0.15;
        }

        return sum + score;
      }, 0) / collections.length;

    return Math.max(0.1, Math.min(1, avgReliability * avgCompleteness));
  }

  /**
   * Reconcile collection contents
   */
  private reconcileCollectionContents(
    contents: { content: CollectionContent; source: MetadataSource }[],
  ): ReconciledField<CollectionContent[]> {
    if (contents.length === 0) {
      return {
        value: [],
        confidence: 0.1,
        sources: [],
        reasoning: "No collection contents available",
      };
    }

    // Group by title
    const grouped = new Map<
      string,
      { content: CollectionContent; source: MetadataSource }[]
    >();

    for (const item of contents) {
      const key = this.normalizeTitle(item.content.title);

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }

      grouped.get(key)!.push(item);
    }

    // Reconcile each group
    const reconciled: CollectionContent[] = [];
    for (const group of grouped.values()) {
      const sorted = group.toSorted(
        (a, b) => b.source.reliability - a.source.reliability,
      );

      const primary = sorted[0].content;

      // Merge information
      const merged: CollectionContent = {
        title: primary.title,
        type: primary.type,
        authors: primary.authors ? [...primary.authors] : [],
        pageRange: primary.pageRange,
        position: primary.position,
        originalPublication: primary.originalPublication,
      };

      // Merge from other sources
      for (let i = 1; i < sorted.length; i++) {
        const { authors, originalPublication, pageRange, position, type } =
          sorted[i].content;

        if (!merged.type && type) {
          merged.type = type;
        }

        if (!merged.pageRange && pageRange) {
          merged.pageRange = pageRange;
        }

        if (!merged.position && position) {
          merged.position = position;
        }

        if (!merged.originalPublication && originalPublication) {
          merged.originalPublication = originalPublication;
        }

        // Merge authors
        if (authors) {
          for (const author of authors) {
            if (!merged.authors!.includes(author)) {
              merged.authors!.push(author);
            }
          }
        }
      }

      reconciled.push(merged);
    }

    // Sort by position if available
    reconciled.sort((a, b) =>
      a.position !== undefined && b.position !== undefined
        ? a.position - b.position
        : a.title.localeCompare(b.title),
    );

    const confidence = this.calculateContentsConfidence(
      reconciled,
      contents.map(({ source }) => source),
    );

    return {
      value: reconciled,
      confidence,
      sources: contents.map(({ source }) => source),
      reasoning: `Reconciled ${reconciled.length} collection contents from ${contents.length} sources`,
    };
  }

  /**
   * Calculate contents confidence
   */
  private calculateContentsConfidence(
    contents: CollectionContent[],
    sources: MetadataSource[],
  ): number {
    if (contents.length === 0) {
      return 0.1;
    }

    const avgReliability =
      sources.reduce((sum, { reliability }) => sum + reliability, 0) /
      sources.length;

    const avgCompleteness =
      contents.reduce((sum, { authors, pageRange, position, type }) => {
        // Base for title
        let score = 0.3;

        if (type) {
          score += 0.2;
        }

        if (authors && authors.length > 0) {
          score += 0.2;
        }

        if (pageRange) {
          score += 0.15;
        }

        if (position !== undefined) {
          score += 0.15;
        }

        return sum + score;
      }, 0) / contents.length;

    return Math.max(0.1, Math.min(1, avgReliability * avgCompleteness));
  }
}
