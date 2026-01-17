import type {
  Conflict,
  MetadataSource,
  PublicationDate,
  Publisher,
  ReconciledField,
} from "./types.js";

/**
 * Configuration for conflict detection
 */
export interface ConflictDetectionConfig {
  /** Minimum difference threshold for numeric values to be considered conflicting */
  numericThreshold: number;
  /** Minimum string similarity threshold below which strings are considered conflicting */
  stringSimilarityThreshold: number;
  /** Minimum date difference in days to be considered conflicting */
  dateDifferenceThreshold: number;
  /** Whether to detect minor conflicts (e.g., formatting differences) */
  detectMinorConflicts: boolean;
  /** Maximum number of conflicts to report per field */
  maxConflictsPerField: number;
}

/**
 * Types of conflicts that can be detected
 */
export type ConflictType =
  | "value_mismatch" // Different values from different sources
  | "format_difference" // Same value in different formats
  | "precision_difference" // Different levels of precision
  | "completeness_difference" // Some sources have more complete data
  | "quality_difference" // Different quality levels of the same data
  | "temporal_difference" // Values that changed over time
  | "source_disagreement" // Reliable sources disagree
  | "normalization_conflict"; // Conflicts in how data should be normalized

/**
 * Severity levels for conflicts
 */
export type ConflictSeverity = "critical" | "major" | "minor" | "informational";

/**
 * Enhanced conflict information with detailed analysis
 */
export interface DetailedConflict extends Conflict {
  /** Type of conflict detected */
  type: ConflictType;
  /** Severity of the conflict */
  severity: ConflictSeverity;
  /** Confidence in the conflict detection (0-1) */
  confidence: number;
  /** Detailed explanation of why this is considered a conflict */
  explanation: string;
  /** Suggested resolution strategies */
  resolutionSuggestions: string[];
  /** Impact assessment of the conflict */
  impact: ConflictImpact;
  /** Whether this conflict can be automatically resolved */
  autoResolvable: boolean;
  /** Metadata about when and how this conflict was detected */
  detectionMetadata: ConflictDetectionMetadata;
}

/**
 * Impact assessment for a conflict
 */
export interface ConflictImpact {
  /** Overall impact score (0-1, higher = more impactful) */
  score: number;
  /** Areas affected by this conflict */
  affectedAreas: string[];
  /** User-facing description of the impact */
  description: string;
  /** Whether this conflict affects core metadata */
  affectsCoreMetadata: boolean;
}

/**
 * Metadata about conflict detection
 */
export interface ConflictDetectionMetadata {
  /** When the conflict was detected */
  detectedAt: Date;
  /** Algorithm or method used to detect the conflict */
  detectionMethod: string;
  /** Version of the detection algorithm */
  algorithmVersion: string;
  /** Additional context about the detection */
  context?: Record<string, unknown>;
}

/**
 * Summary of all conflicts found in a metadata set
 */
export interface ConflictSummary {
  /** Total number of conflicts */
  totalConflicts: number;
  /** Conflicts grouped by severity */
  bySeverity: Record<ConflictSeverity, DetailedConflict[]>;
  /** Conflicts grouped by type */
  byType: Record<ConflictType, DetailedConflict[]>;
  /** Conflicts grouped by field */
  byField: Record<string, DetailedConflict[]>;
  /** Overall conflict score (0-1, higher = more conflicts) */
  overallScore: number;
  /** Most problematic fields */
  problematicFields: string[];
  /** Recommended actions */
  recommendations: string[];
  /** Auto-resolvable conflicts */
  autoResolvableConflicts: DetailedConflict[];
  /** Conflicts requiring manual intervention */
  manualConflicts: DetailedConflict[];
}

/**
 * ConflictDetector identifies and analyzes conflicts in metadata reconciliation
 */
export class ConflictDetector {
  private config: ConflictDetectionConfig;
  private readonly algorithmVersion = "1.0.0";

  constructor(config: Partial<ConflictDetectionConfig> = {}) {
    this.config = {
      numericThreshold: 0.05, // 5% difference
      stringSimilarityThreshold: 0.8, // 80% similarity
      dateDifferenceThreshold: 30, // 30 days
      detectMinorConflicts: true,
      maxConflictsPerField: 10,
      ...config,
    };
  }

  /**
   * Detect conflicts in a reconciled field
   */
  detectFieldConflicts<T>(
    field: ReconciledField<T>,
    fieldName: string,
    rawValues: Array<{ value: T; source: MetadataSource }>,
  ): DetailedConflict[] {
    if (rawValues.length < 2) {
      return []; // No conflicts possible with less than 2 sources
    }

    const conflicts: DetailedConflict[] = [];

    // Group values by similarity
    const valueGroups = this.groupSimilarValues(rawValues, fieldName);

    if (valueGroups.length > 1) {
      // We have conflicting value groups
      const conflict = this.createValueMismatchConflict(
        fieldName,
        valueGroups,
        field.reasoning ?? "Used most reliable source",
      );
      conflicts.push(conflict);
    }

    // Check for format differences within the same logical value
    const formatConflicts = this.detectFormatDifferences(rawValues, fieldName);
    conflicts.push(...formatConflicts);

    // Check for precision differences
    const precisionConflicts = this.detectPrecisionDifferences(rawValues, fieldName);
    conflicts.push(...precisionConflicts);

    // Check for completeness differences
    const completenessConflicts = this.detectCompletenessDifferences(rawValues, fieldName);
    conflicts.push(...completenessConflicts);

    // Check for quality differences
    const qualityConflicts = this.detectQualityDifferences(rawValues, fieldName);
    conflicts.push(...qualityConflicts);

    // Limit the number of conflicts reported
    return conflicts.slice(0, this.config.maxConflictsPerField);
  }

  /**
   * Analyze all conflicts in a metadata preview
   */
  analyzeAllConflicts(
    fields: Record<string, ReconciledField<any>>,
    rawMetadata: Record<string, Array<{ value: any; source: MetadataSource }>>,
  ): ConflictSummary {
    const allConflicts: DetailedConflict[] = [];

    // Detect conflicts in each field
    for (const [fieldName, field] of Object.entries(fields)) {
      const rawValues = rawMetadata[fieldName] || [];
      const fieldConflicts = this.detectFieldConflicts(field, fieldName, rawValues);
      allConflicts.push(...fieldConflicts);
    }

    return this.createConflictSummary(allConflicts);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConflictDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ConflictDetectionConfig {
    return { ...this.config };
  }

  /**
   * Group similar values together to identify distinct conflicting groups
   */
  private groupSimilarValues<T>(
    rawValues: Array<{ value: T; source: MetadataSource }>,
    fieldName: string,
  ): Array<Array<{ value: T; source: MetadataSource }>> {
    const groups: Array<Array<{ value: T; source: MetadataSource }>> = [];

    for (const item of rawValues) {
      let addedToGroup = false;

      for (const group of groups) {
        if (this.areValuesSimilar(item.value, group[0].value, fieldName)) {
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
   * Check if two values are similar enough to be considered the same
   */
  private areValuesSimilar<T>(value1: T, value2: T, fieldName: string): boolean {
    if (value1 === value2) return true;
    if (value1 == null || value2 == null) return value1 === value2;

    // Handle different types based on field name and value type
    if (typeof value1 === "string" && typeof value2 === "string") {
      return (
        this.calculateStringSimilarity(value1, value2) >= this.config.stringSimilarityThreshold
      );
    }

    if (typeof value1 === "number" && typeof value2 === "number") {
      const diff = Math.abs(value1 - value2);
      const avg = (value1 + value2) / 2;
      return avg === 0 ? diff === 0 : diff / avg <= this.config.numericThreshold;
    }

    // Handle dates
    if (this.isDate(value1) && this.isDate(value2)) {
      const date1 = new Date(value1 as any);
      const date2 = new Date(value2 as any);
      const diffDays = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= this.config.dateDifferenceThreshold;
    }

    // Handle arrays
    if (Array.isArray(value1) && Array.isArray(value2)) {
      if (value1.length !== value2.length) return false;
      return value1.every((item, index) => this.areValuesSimilar(item, value2[index], fieldName));
    }

    // Handle objects
    if (typeof value1 === "object" && typeof value2 === "object") {
      return this.areObjectsSimilar(value1, value2, fieldName);
    }

    return false;
  }

  /**
   * Check if two objects are similar
   */
  private areObjectsSimilar(obj1: any, obj2: any, fieldName: string): boolean {
    if (obj1 === obj2) return true;
    if (!obj1 || !obj2) return false;

    // Handle specific object types
    if (fieldName === "publicationDate") {
      return this.arePublicationDatesSimilar(obj1 as PublicationDate, obj2 as PublicationDate);
    }

    if (fieldName === "publisher") {
      return this.arePublishersSimilar(obj1 as Publisher, obj2 as Publisher);
    }

    // Generic object comparison
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    const allKeys = new Set([...keys1, ...keys2]);

    for (const key of allKeys) {
      if (!this.areValuesSimilar(obj1[key], obj2[key], key)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if two publication dates are similar
   */
  private arePublicationDatesSimilar(date1: PublicationDate, date2: PublicationDate): boolean {
    // If both have years, compare years
    if (date1.year && date2.year) {
      return Math.abs(date1.year - date2.year) <= 1; // Allow 1 year difference
    }

    // If precision is different, they might still be the same
    if (date1.precision !== date2.precision) {
      // More specific date should contain the less specific one
      if (date1.precision === "year" && date2.year === date1.year) return true;
      if (date2.precision === "year" && date1.year === date2.year) return true;
    }

    return false;
  }

  /**
   * Check if two publishers are similar
   */
  private arePublishersSimilar(pub1: Publisher, pub2: Publisher): boolean {
    // Compare normalized names if available
    if (pub1.normalized && pub2.normalized) {
      return (
        this.calculateStringSimilarity(pub1.normalized, pub2.normalized) >=
        this.config.stringSimilarityThreshold
      );
    }

    // Compare regular names
    return (
      this.calculateStringSimilarity(pub1.name, pub2.name) >= this.config.stringSimilarityThreshold
    );
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1)
      .fill(null)
      .map(() => Array(len1 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + cost,
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len2][len1]) / maxLen;
  }

  /**
   * Check if a value is a date
   */
  private isDate(value: any): boolean {
    return (
      value instanceof Date ||
      (typeof value === "string" && !isNaN(Date.parse(value))) ||
      (typeof value === "object" && value !== null && "year" in value)
    );
  }

  /**
   * Create a value mismatch conflict
   */
  private createValueMismatchConflict<T>(
    fieldName: string,
    valueGroups: Array<Array<{ value: T; source: MetadataSource }>>,
    resolution: string,
  ): DetailedConflict {
    const allValues = valueGroups.flat();
    const severity = this.determineSeverity(fieldName, valueGroups);
    const impact = this.assessConflictImpact(fieldName, valueGroups);

    return {
      field: fieldName,
      values: allValues.map((item) => ({ value: item.value, source: item.source })),
      resolution,
      type: "value_mismatch",
      severity,
      confidence: this.calculateConflictConfidence(valueGroups),
      explanation: this.generateConflictExplanation(fieldName, valueGroups, "value_mismatch"),
      resolutionSuggestions: this.generateResolutionSuggestions(
        fieldName,
        valueGroups,
        "value_mismatch",
      ),
      impact,
      autoResolvable: this.isAutoResolvable(fieldName, valueGroups, "value_mismatch"),
      detectionMetadata: {
        detectedAt: new Date(),
        detectionMethod: "value_grouping",
        algorithmVersion: this.algorithmVersion,
        context: { groupCount: valueGroups.length, totalValues: allValues.length },
      },
    };
  }

  /**
   * Detect format differences (same logical value, different format)
   */
  private detectFormatDifferences<T>(
    rawValues: Array<{ value: T; source: MetadataSource }>,
    fieldName: string,
  ): DetailedConflict[] {
    if (!this.config.detectMinorConflicts) return [];

    const conflicts: DetailedConflict[] = [];

    // Check for common format differences based on field type
    if (fieldName === "isbn") {
      const isbnConflicts = this.detectISBNFormatDifferences(
        rawValues as Array<{ value: string | string[]; source: MetadataSource }>,
      );
      conflicts.push(...isbnConflicts);
    }

    if (fieldName === "publicationDate") {
      const dateConflicts = this.detectDateFormatDifferences(
        rawValues as Array<{ value: PublicationDate | string; source: MetadataSource }>,
      );
      conflicts.push(...dateConflicts);
    }

    return conflicts;
  }

  /**
   * Detect ISBN format differences (ISBN-10 vs ISBN-13, with/without hyphens)
   */
  private detectISBNFormatDifferences(
    rawValues: Array<{ value: string | string[]; source: MetadataSource }>,
  ): DetailedConflict[] {
    const conflicts: DetailedConflict[] = [];
    const isbnFormats = new Map<
      string,
      Array<{ value: string | string[]; source: MetadataSource }>
    >();

    for (const item of rawValues) {
      const isbns = Array.isArray(item.value) ? item.value : [item.value];
      for (const isbn of isbns) {
        if (typeof isbn === "string") {
          const normalized = isbn.replace(/[-\s]/g, "");

          if (!isbnFormats.has(normalized)) {
            isbnFormats.set(normalized, []);
          }
          isbnFormats.get(normalized)!.push(item);
        }
      }
    }

    // Check for same ISBN in different formats
    for (const [normalizedISBN, sources] of isbnFormats.entries()) {
      if (sources.length > 1) {
        const uniqueFormats = new Set(
          sources.map((s) => {
            const isbns = Array.isArray(s.value) ? s.value : [s.value];
            return isbns.find(
              (isbn) => typeof isbn === "string" && isbn.replace(/[-\s]/g, "") === normalizedISBN,
            );
          }),
        );

        if (uniqueFormats.size > 1) {
          conflicts.push({
            field: "isbn",
            values: sources.map((s) => ({ value: s.value, source: s.source })),
            resolution: "Normalized to standard ISBN-13 format",
            type: "format_difference",
            severity: "minor",
            confidence: 0.9,
            explanation: `Same ISBN found in different formats: ${Array.from(uniqueFormats).join(", ")}`,
            resolutionSuggestions: [
              "Normalize all ISBNs to ISBN-13 format",
              "Remove hyphens for consistent formatting",
              "Validate ISBN checksums",
            ],
            impact: {
              score: 0.2,
              affectedAreas: ["identification", "deduplication"],
              description: "Minor formatting inconsistency that could affect book identification",
              affectsCoreMetadata: false,
            },
            autoResolvable: true,
            detectionMetadata: {
              detectedAt: new Date(),
              detectionMethod: "isbn_format_analysis",
              algorithmVersion: this.algorithmVersion,
              context: { normalizedISBN, formatCount: uniqueFormats.size },
            },
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect date format differences
   */
  private detectDateFormatDifferences(
    rawValues: Array<{ value: PublicationDate | string; source: MetadataSource }>,
  ): DetailedConflict[] {
    const conflicts: DetailedConflict[] = [];
    const datesByYear = new Map<
      number,
      Array<{ value: PublicationDate | string; source: MetadataSource }>
    >();

    for (const item of rawValues) {
      let year: number | undefined;

      if (typeof item.value === "string") {
        const parsed = new Date(item.value);
        if (!isNaN(parsed.getTime())) {
          year = parsed.getFullYear();
        }
      } else if (item.value && typeof item.value === "object" && "year" in item.value) {
        year = item.value.year;
      }

      if (year) {
        if (!datesByYear.has(year)) {
          datesByYear.set(year, []);
        }
        datesByYear.get(year)!.push(item);
      }
    }

    // Check for same year with different precision/formats
    for (const [year, sources] of datesByYear.entries()) {
      if (sources.length > 1) {
        const precisions = new Set(
          sources.map((s) => {
            if (typeof s.value === "string") return "string";
            if (s.value && typeof s.value === "object" && "precision" in s.value) {
              return s.value.precision;
            }
            return "unknown";
          }),
        );

        if (precisions.size > 1) {
          conflicts.push({
            field: "publicationDate",
            values: sources.map((s) => ({ value: s.value, source: s.source })),
            resolution: "Used most precise date format available",
            type: "precision_difference",
            severity: "minor",
            confidence: 0.8,
            explanation: `Same publication year (${year}) found with different precision levels: ${Array.from(precisions).join(", ")}`,
            resolutionSuggestions: [
              "Use the most precise date available",
              "Standardize date format across sources",
              "Preserve original precision information",
            ],
            impact: {
              score: 0.3,
              affectedAreas: ["chronology", "sorting"],
              description: "Different date precision levels may affect chronological ordering",
              affectsCoreMetadata: false,
            },
            autoResolvable: true,
            detectionMetadata: {
              detectedAt: new Date(),
              detectionMethod: "date_precision_analysis",
              algorithmVersion: this.algorithmVersion,
              context: { year, precisionCount: precisions.size },
            },
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect precision differences
   */
  private detectPrecisionDifferences<T>(
    _rawValues: Array<{ value: T; source: MetadataSource }>,
    _fieldName: string,
  ): DetailedConflict[] {
    // This is handled in format differences for now
    // Could be expanded for other field types
    return [];
  }

  /**
   * Detect completeness differences
   */
  private detectCompletenessDifferences<T>(
    rawValues: Array<{ value: T; source: MetadataSource }>,
    fieldName: string,
  ): DetailedConflict[] {
    const conflicts: DetailedConflict[] = [];

    // Check for cases where some sources have more complete data
    if (fieldName === "authors" || fieldName === "subjects" || fieldName === "identifiers") {
      const lengthsBySource = rawValues.map((item) => ({
        source: item.source,
        length: Array.isArray(item.value) ? item.value.length : item.value ? 1 : 0,
      }));

      const maxLength = Math.max(...lengthsBySource.map((l) => l.length));
      const minLength = Math.min(...lengthsBySource.map((l) => l.length));

      if (maxLength > minLength * 2) {
        // Significant difference in completeness
        conflicts.push({
          field: fieldName,
          values: rawValues.map((item) => ({ value: item.value, source: item.source })),
          resolution: "Combined data from all sources to maximize completeness",
          type: "completeness_difference",
          severity: "minor",
          confidence: 0.7,
          explanation: `Significant difference in data completeness: ${minLength} to ${maxLength} items across sources`,
          resolutionSuggestions: [
            "Combine data from all sources",
            "Prioritize more complete sources",
            "Investigate why some sources have less data",
          ],
          impact: {
            score: 0.4,
            affectedAreas: ["completeness", "discovery"],
            description: "Some sources provide significantly more complete data",
            affectsCoreMetadata: false,
          },
          autoResolvable: true,
          detectionMetadata: {
            detectedAt: new Date(),
            detectionMethod: "completeness_analysis",
            algorithmVersion: this.algorithmVersion,
            context: { minLength, maxLength, sourceCount: rawValues.length },
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect quality differences
   */
  private detectQualityDifferences<T>(
    rawValues: Array<{ value: T; source: MetadataSource }>,
    fieldName: string,
  ): DetailedConflict[] {
    const conflicts: DetailedConflict[] = [];

    // Check for significant quality differences between sources
    const reliabilityDiff =
      Math.max(...rawValues.map((v) => v.source.reliability)) -
      Math.min(...rawValues.map((v) => v.source.reliability));

    if (reliabilityDiff > 0.3) {
      // Significant reliability difference
      const highReliabilitySources = rawValues.filter((v) => v.source.reliability > 0.8);
      const lowReliabilitySources = rawValues.filter((v) => v.source.reliability < 0.5);

      if (highReliabilitySources.length > 0 && lowReliabilitySources.length > 0) {
        conflicts.push({
          field: fieldName,
          values: rawValues.map((item) => ({ value: item.value, source: item.source })),
          resolution: "Prioritized data from more reliable sources",
          type: "quality_difference",
          severity: "minor",
          confidence: 0.8,
          explanation: `Significant quality difference between sources (reliability range: ${Math.min(...rawValues.map((v) => v.source.reliability)).toFixed(2)} - ${Math.max(...rawValues.map((v) => v.source.reliability)).toFixed(2)})`,
          resolutionSuggestions: [
            "Prioritize high-reliability sources",
            "Use low-reliability sources only to fill gaps",
            "Consider source-specific confidence adjustments",
          ],
          impact: {
            score: 0.3,
            affectedAreas: ["accuracy", "confidence"],
            description: "Quality differences between sources may affect data accuracy",
            affectsCoreMetadata: false,
          },
          autoResolvable: true,
          detectionMetadata: {
            detectedAt: new Date(),
            detectionMethod: "quality_analysis",
            algorithmVersion: this.algorithmVersion,
            context: {
              reliabilityDiff,
              highQualityCount: highReliabilitySources.length,
              lowQualityCount: lowReliabilitySources.length,
            },
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Determine conflict severity
   */
  private determineSeverity(
    fieldName: string,
    valueGroups: Array<Array<{ value: any; source: MetadataSource }>>,
  ): ConflictSeverity {
    // Core fields have higher severity
    const coreFields = ["title", "authors", "isbn", "publicationDate"];
    const isCore = coreFields.includes(fieldName);

    // Number of conflicting groups affects severity
    const groupCount = valueGroups.length;

    // Source reliability affects severity
    const allSources = valueGroups.flat().map((v) => v.source);
    const hasHighReliabilitySources = allSources.some((s) => s.reliability > 0.8);
    const hasLowReliabilitySources = allSources.some((s) => s.reliability < 0.5);

    if (isCore && groupCount > 2 && hasHighReliabilitySources) {
      return "critical";
    }

    if (isCore && groupCount > 1 && hasHighReliabilitySources) {
      return "major";
    }

    if (groupCount > 2 || (isCore && hasLowReliabilitySources)) {
      return "minor";
    }

    return "informational";
  }

  /**
   * Assess the impact of a conflict
   */
  private assessConflictImpact(
    fieldName: string,
    valueGroups: Array<Array<{ value: any; source: MetadataSource }>>,
  ): ConflictImpact {
    const coreFields = ["title", "authors", "isbn", "publicationDate"];
    const isCore = coreFields.includes(fieldName);
    const groupCount = valueGroups.length;

    let score = 0.1; // Base score
    const affectedAreas: string[] = [];

    if (isCore) {
      score += 0.4;
      affectedAreas.push("identification", "search", "cataloging");
    }

    if (groupCount > 2) {
      score += 0.2;
      affectedAreas.push("data_quality");
    }

    if (fieldName === "title") {
      affectedAreas.push("display", "user_experience");
    }

    if (fieldName === "authors") {
      affectedAreas.push("attribution", "discovery");
    }

    if (fieldName === "isbn") {
      affectedAreas.push("deduplication", "external_linking");
    }

    const description = this.generateImpactDescription(fieldName, groupCount, isCore);

    return { score: Math.min(1, score), affectedAreas, description, affectsCoreMetadata: isCore };
  }

  /**
   * Generate impact description
   */
  private generateImpactDescription(
    fieldName: string,
    groupCount: number,
    isCore: boolean,
  ): string {
    if (isCore) {
      return `Conflict in core field '${fieldName}' with ${groupCount} different values may affect book identification and user experience`;
    }
    return `Conflict in '${fieldName}' with ${groupCount} different values may affect data completeness and accuracy`;
  }

  /**
   * Calculate confidence in conflict detection
   */
  private calculateConflictConfidence(
    valueGroups: Array<Array<{ value: any; source: MetadataSource }>>,
  ): number {
    let confidence = 0.5; // Base confidence

    // More groups = higher confidence in conflict
    confidence += Math.min(0.3, (valueGroups.length - 1) * 0.1);

    // Source reliability affects confidence
    const allSources = valueGroups.flat().map((v) => v.source);
    const avgReliability =
      allSources.reduce((sum, s) => sum + s.reliability, 0) / allSources.length;
    confidence += avgReliability * 0.2;

    return Math.min(1, confidence);
  }

  /**
   * Generate explanation for a conflict
   */
  private generateConflictExplanation(
    fieldName: string,
    valueGroups: Array<Array<{ value: any; source: MetadataSource }>>,
    conflictType: ConflictType,
  ): string {
    const groupCount = valueGroups.length;
    const sourceCount = valueGroups.flat().length;

    switch (conflictType) {
      case "value_mismatch":
        return `Found ${groupCount} different values for '${fieldName}' across ${sourceCount} sources. This indicates disagreement between metadata providers about the correct value.`;

      case "format_difference":
        return `Same logical value for '${fieldName}' found in different formats across sources. This is typically a minor formatting inconsistency.`;

      case "precision_difference":
        return `Different levels of precision found for '${fieldName}' across sources. Some sources provide more detailed information than others.`;

      case "completeness_difference":
        return `Significant difference in data completeness for '${fieldName}' between sources. Some sources provide more comprehensive information.`;

      case "quality_difference":
        return `Quality differences detected for '${fieldName}' based on source reliability scores. Some sources are considered more trustworthy than others.`;

      default:
        return `Conflict detected in '${fieldName}' field across multiple sources.`;
    }
  }

  /**
   * Generate resolution suggestions
   */
  private generateResolutionSuggestions(
    fieldName: string,
    _valueGroups: Array<Array<{ value: any; source: MetadataSource }>>,
    conflictType: ConflictType,
  ): string[] {
    const suggestions: string[] = [];

    switch (conflictType) {
      case "value_mismatch":
        suggestions.push("Review source reliability and prioritize most trustworthy sources");
        suggestions.push("Consider manual verification of conflicting values");
        suggestions.push("Look for additional sources to break ties");
        if (fieldName === "title") {
          suggestions.push("Check for alternate titles or editions");
        }
        break;

      case "format_difference":
        suggestions.push("Normalize all values to a consistent format");
        suggestions.push("Preserve original format information if needed");
        break;

      case "precision_difference":
        suggestions.push("Use the most precise value available");
        suggestions.push("Combine information from multiple sources when possible");
        break;

      case "completeness_difference":
        suggestions.push("Merge data from all sources to maximize completeness");
        suggestions.push("Prioritize sources with more complete information");
        break;

      case "quality_difference":
        suggestions.push("Weight values by source reliability");
        suggestions.push("Use high-quality sources as primary, others as fallback");
        break;
    }

    return suggestions;
  }

  /**
   * Check if a conflict can be automatically resolved
   */
  private isAutoResolvable(
    _fieldName: string,
    valueGroups: Array<Array<{ value: any; source: MetadataSource }>>,
    conflictType: ConflictType,
  ): boolean {
    switch (conflictType) {
      case "format_difference":
      case "precision_difference":
      case "completeness_difference":
      case "quality_difference":
        return true;

      case "value_mismatch":
        // Auto-resolvable if there's a clear reliability winner
        const allSources = valueGroups.flat().map((v) => v.source);
        const maxReliability = Math.max(...allSources.map((s) => s.reliability));
        const highReliabilitySources = allSources.filter((s) => s.reliability === maxReliability);
        return highReliabilitySources.length === 1 && maxReliability > 0.8;

      default:
        return false;
    }
  }

  /**
   * Create a comprehensive conflict summary
   */
  private createConflictSummary(conflicts: DetailedConflict[]): ConflictSummary {
    const bySeverity: Record<ConflictSeverity, DetailedConflict[]> = {
      critical: [],
      major: [],
      minor: [],
      informational: [],
    };

    const byType: Record<ConflictType, DetailedConflict[]> = {
      value_mismatch: [],
      format_difference: [],
      precision_difference: [],
      completeness_difference: [],
      quality_difference: [],
      temporal_difference: [],
      source_disagreement: [],
      normalization_conflict: [],
    };

    const byField: Record<string, DetailedConflict[]> = {};

    // Group conflicts
    for (const conflict of conflicts) {
      bySeverity[conflict.severity].push(conflict);
      byType[conflict.type].push(conflict);

      if (!byField[conflict.field]) {
        byField[conflict.field] = [];
      }
      byField[conflict.field].push(conflict);
    }

    // Calculate overall score
    const severityWeights = { critical: 1.0, major: 0.7, minor: 0.4, informational: 0.1 };
    const weightedScore = conflicts.reduce((sum, c) => sum + severityWeights[c.severity], 0);
    const overallScore = Math.min(1, weightedScore / 10); // Normalize to 0-1

    // Find most problematic fields
    const fieldScores = Object.entries(byField).map(([field, fieldConflicts]) => ({
      field,
      score: fieldConflicts.reduce((sum, c) => sum + severityWeights[c.severity], 0),
    }));
    const problematicFields = fieldScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((f) => f.field);

    // Generate recommendations
    const recommendations = this.generateRecommendations(conflicts, bySeverity);

    // Separate auto-resolvable and manual conflicts
    const autoResolvableConflicts = conflicts.filter((c) => c.autoResolvable);
    const manualConflicts = conflicts.filter((c) => !c.autoResolvable);

    return {
      totalConflicts: conflicts.length,
      bySeverity,
      byType,
      byField,
      overallScore,
      problematicFields,
      recommendations,
      autoResolvableConflicts,
      manualConflicts,
    };
  }

  /**
   * Generate recommendations based on conflict analysis
   */
  private generateRecommendations(
    conflicts: DetailedConflict[],
    bySeverity: Record<ConflictSeverity, DetailedConflict[]>,
  ): string[] {
    const recommendations: string[] = [];

    if (bySeverity.critical.length > 0) {
      recommendations.push(
        `Address ${bySeverity.critical.length} critical conflicts immediately - these affect core metadata`,
      );
    }

    if (bySeverity.major.length > 0) {
      recommendations.push(
        `Review ${bySeverity.major.length} major conflicts - these may impact data quality`,
      );
    }

    const autoResolvable = conflicts.filter((c) => c.autoResolvable).length;
    if (autoResolvable > 0) {
      recommendations.push(`${autoResolvable} conflicts can be automatically resolved`);
    }

    const manualCount = conflicts.filter((c) => !c.autoResolvable).length;
    if (manualCount > 0) {
      recommendations.push(`${manualCount} conflicts require manual review`);
    }

    if (conflicts.length === 0) {
      recommendations.push("No conflicts detected - metadata appears consistent across sources");
    }

    return recommendations;
  }
}
