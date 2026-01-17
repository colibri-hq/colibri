import { resolveLanguage, getLanguageByIso3 } from "@colibri-hq/languages";
import type {
  Conflict,
  FormatInfo,
  LanguageInfo,
  MetadataSource,
  PhysicalDescriptionInput,
  PhysicalDimensions,
  ReconciledField,
  ReconciledPhysicalDescription,
} from "./types.js";

/**
 * Normalizes and reconciles physical and format descriptions from various sources
 */
export class PhysicalReconciler {
  /**
   * Normalize page count from various input formats
   */
  normalizePageCount(input: number | string): number | undefined {
    if (typeof input === "number") {
      return input > 0 && input < 50000 ? Math.floor(input) : undefined;
    }

    if (typeof input === "string") {
      // Extract numbers from strings like "320 pages", "pp. 256", "xiv + 342"
      const cleaned = input.toLowerCase().replace(/[^\d\s+]/g, " ");
      const numbers = cleaned.match(/\d+/g);

      if (numbers) {
        // If multiple numbers, take the largest (likely the main page count)
        const pageCount = Math.max(...numbers.map((n) => parseInt(n, 10)));
        return pageCount > 0 && pageCount < 50000 ? pageCount : undefined;
      }
    }

    return undefined;
  }

  /**
   * Normalize physical dimensions from various input formats
   */
  normalizeDimensions(input: string | PhysicalDimensions): PhysicalDimensions {
    if (typeof input === "object" && input !== null) {
      return this.validateDimensions(input);
    }

    return this.parseDimensionString(input);
  }

  /**
   * Normalize format information from various input formats
   */
  normalizeFormat(input: string | FormatInfo, bindingHint?: string): FormatInfo {
    if (typeof input === "object" && input !== null) {
      return this.validateFormat(input);
    }

    return this.parseFormatString(input, bindingHint);
  }

  /**
   * Normalize language information from various input formats
   */
  normalizeLanguages(input: string | string[] | LanguageInfo[]): LanguageInfo[] {
    if (!input) return [];

    const inputs = Array.isArray(input) ? input : [input];
    const results: LanguageInfo[] = [];

    for (const lang of inputs) {
      if (typeof lang === "string") {
        const normalized = this.parseLanguageString(lang);
        if (normalized) results.push(normalized);
      } else if (typeof lang === "object" && lang !== null) {
        const validated = this.validateLanguageInfo(lang);
        if (validated) results.push(validated);
      }
    }

    return results;
  }

  /**
   * Reconcile page counts from multiple sources
   */
  reconcilePageCounts(inputs: PhysicalDescriptionInput[]): ReconciledField<number> {
    const pageCounts = inputs
      .map((input) => ({
        count: this.normalizePageCount(input.pageCount || 0),
        source: input.source,
      }))
      .filter((item) => item.count !== undefined) as Array<{
      count: number;
      source: MetadataSource;
    }>;

    if (pageCounts.length === 0) {
      return {
        value: 0,
        confidence: 0,
        sources: inputs.map((i) => i.source),
        reasoning: "No valid page counts found",
      };
    }

    if (pageCounts.length === 1) {
      return {
        value: pageCounts[0].count,
        confidence: pageCounts[0].source.reliability * 0.8,
        sources: [pageCounts[0].source],
        reasoning: "Single page count source",
      };
    }

    // Group similar page counts (within 5% or 10 pages)
    const groups = new Map<number, Array<{ count: number; source: MetadataSource }>>();

    for (const item of pageCounts) {
      let foundGroup = false;

      for (const [groupKey, groupItems] of groups.entries()) {
        const diff = Math.abs(item.count - groupKey);
        const percentDiff = diff / Math.max(item.count, groupKey);

        if (diff <= 10 || percentDiff <= 0.05) {
          groupItems.push(item);
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        groups.set(item.count, [item]);
      }
    }

    // Find the group with highest total reliability
    let bestGroup: Array<{ count: number; source: MetadataSource }> = [];
    let bestReliability = 0;

    for (const group of groups.values()) {
      const totalReliability = group.reduce((sum, item) => sum + item.source.reliability, 0);
      if (totalReliability > bestReliability) {
        bestReliability = totalReliability;
        bestGroup = group;
      }
    }

    // Calculate weighted average within the best group
    const totalWeight = bestGroup.reduce((sum, item) => sum + item.source.reliability, 0);
    const weightedSum = bestGroup.reduce(
      (sum, item) => sum + item.count * item.source.reliability,
      0,
    );
    const averageCount = Math.round(weightedSum / totalWeight);

    const conflicts: Conflict[] = [];
    if (groups.size > 1) {
      conflicts.push({
        field: "page_count",
        values: Array.from(groups.keys()).map((count) => ({
          value: count,
          source: groups.get(count)![0].source,
        })),
        resolution: "Selected page count from most reliable sources",
      });
    }

    return {
      value: averageCount,
      confidence: Math.min(0.95, (bestReliability / pageCounts.length) * 0.9),
      sources: bestGroup.map((item) => item.source),
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      reasoning:
        conflicts.length > 0
          ? `Reconciled ${pageCounts.length} page counts with conflicts, selected from ${bestGroup.length} agreeing sources`
          : `Averaged ${bestGroup.length} agreeing page counts`,
    };
  }

  /**
   * Reconcile physical descriptions from multiple sources
   */
  reconcilePhysicalDescriptions(inputs: PhysicalDescriptionInput[]): ReconciledPhysicalDescription {
    if (inputs.length === 0) {
      throw new Error("No physical descriptions to reconcile");
    }

    // Reconcile page counts
    const pageCount = this.reconcilePageCounts(inputs);

    // Reconcile dimensions
    const dimensions = this.reconcileDimensions(inputs);

    // Reconcile formats
    const format = this.reconcileFormats(inputs);

    // Reconcile languages
    const languages = this.reconcileLanguages(inputs);

    // Reconcile weights
    const weight = this.reconcileWeights(inputs);

    return { pageCount, dimensions, format, languages, weight };
  }

  /**
   * Parse dimension strings like "8.5 x 11 in", "210 x 297 mm", "15.2 cm x 22.9 cm"
   */
  private parseDimensionString(dimensionStr: string): PhysicalDimensions {
    const result: PhysicalDimensions = { raw: dimensionStr };

    // Common patterns for dimensions
    const patterns = [
      // "8.5 x 11 x 0.5 in" or "8.5 × 11 × 0.5 in"
      /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\s*(mm|cm|in|inches?)/i,
      // "210mm x 297mm x 5mm"
      /(\d+(?:\.\d+)?)\s*(mm|cm|in|inches?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|in|inches?)(?:\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|in|inches?))?/i,
      // "H: 23cm, W: 15cm, D: 2cm"
      /(?:h(?:eight)?:?\s*(\d+(?:\.\d+)?)\s*(mm|cm|in|inches?))?.*?(?:w(?:idth)?:?\s*(\d+(?:\.\d+)?)\s*(mm|cm|in|inches?))?.*?(?:d(?:epth)?:?\s*(\d+(?:\.\d+)?)\s*(mm|cm|in|inches?))?/i,
    ];

    for (const pattern of patterns) {
      const match = dimensionStr.match(pattern);
      if (match) {
        const values = match.filter((m, i) => i > 0 && m && /\d/.test(m));
        const units = match.filter((m, i) => i > 0 && m && /^(mm|cm|in|inches?)$/i.test(m));

        if (values.length >= 2) {
          const unit = this.normalizeUnit(units[0] || "mm");
          const [dim1, dim2, dim3] = values.map((v) => parseFloat(v));

          // Convert to millimeters
          const [width, height, depth] = this.convertToMillimeters([dim1, dim2, dim3], unit);

          // Assume first dimension is width, second is height, third is depth
          result.width = width;
          result.height = height;
          if (depth) result.depth = depth;
          result.unit = "mm";
          break;
        }
      }
    }

    return result;
  }

  /**
   * Normalize unit strings
   */
  private normalizeUnit(unit: string): "mm" | "cm" | "in" {
    const normalized = unit.toLowerCase();
    if (normalized.includes("in")) return "in";
    if (normalized.includes("cm")) return "cm";
    return "mm";
  }

  /**
   * Convert dimensions to millimeters
   */
  private convertToMillimeters(
    dimensions: (number | undefined)[],
    unit: "mm" | "cm" | "in",
  ): (number | undefined)[] {
    const conversionFactors = { mm: 1, cm: 10, in: 25.4 };
    const factor = conversionFactors[unit];

    return dimensions.map((dim) => (dim ? Math.round(dim * factor * 100) / 100 : undefined));
  }

  /**
   * Validate and normalize dimensions object
   */
  private validateDimensions(dimensions: PhysicalDimensions): PhysicalDimensions {
    const result: PhysicalDimensions = { ...dimensions };

    // Convert all dimensions to millimeters if needed
    if (dimensions.unit && dimensions.unit !== "mm") {
      const factor = dimensions.unit === "cm" ? 10 : dimensions.unit === "in" ? 25.4 : 1;

      if (dimensions.width) result.width = Math.round(dimensions.width * factor * 100) / 100;
      if (dimensions.height) result.height = Math.round(dimensions.height * factor * 100) / 100;
      if (dimensions.depth) result.depth = Math.round(dimensions.depth * factor * 100) / 100;
      result.unit = "mm";
    }

    // Validate reasonable ranges (in mm)
    if (result.width && (result.width < 10 || result.width > 1000)) result.width = undefined;
    if (result.height && (result.height < 10 || result.height > 1000)) result.height = undefined;
    if (result.depth && (result.depth < 1 || result.depth > 200)) result.depth = undefined;

    return result;
  }

  /**
   * Parse format strings and normalize binding/format types
   */
  private parseFormatString(formatStr: string, bindingHint?: string): FormatInfo {
    const result: FormatInfo = { raw: formatStr };
    const normalized = formatStr.toLowerCase();

    // Detect binding type (check more specific types first)
    if (
      normalized.includes("hardcover") ||
      normalized.includes("hardback") ||
      normalized.includes("hard cover")
    ) {
      result.binding = "hardcover";
    } else if (normalized.includes("mass market") || normalized.includes("pocket")) {
      result.binding = "mass_market";
    } else if (
      normalized.includes("paperback") ||
      normalized.includes("softcover") ||
      normalized.includes("soft cover")
    ) {
      result.binding = "paperback";
    } else if (normalized.includes("board book") || normalized.includes("boardbook")) {
      result.binding = "board_book";
    } else if (
      normalized.includes("spiral") ||
      normalized.includes("wire-o") ||
      normalized.includes("coil")
    ) {
      result.binding = "spiral";
    } else if (normalized.includes("leather")) {
      result.binding = "leather";
    } else if (normalized.includes("cloth")) {
      result.binding = "cloth";
    } else if (
      normalized.includes("digital") ||
      normalized.includes("ebook") ||
      normalized.includes("e-book")
    ) {
      result.binding = "digital";
    } else if (normalized.includes("audio")) {
      result.binding = "audio";
    } else if (bindingHint) {
      // Use binding hint if provided
      result.binding = this.normalizeBindingType(bindingHint);
    }

    // Detect format type
    if (
      normalized.includes("ebook") ||
      normalized.includes("e-book") ||
      normalized.includes("digital")
    ) {
      result.format = "ebook";
      result.medium = "digital";
    } else if (normalized.includes("audiobook") || normalized.includes("audio book")) {
      result.format = "audiobook";
      result.medium = "audio";
    } else if (normalized.includes("magazine")) {
      result.format = "magazine";
      result.medium = "print";
    } else if (normalized.includes("journal")) {
      result.format = "journal";
      result.medium = "print";
    } else if (normalized.includes("newspaper")) {
      result.format = "newspaper";
      result.medium = "print";
    } else if (normalized.includes("braille")) {
      result.format = "book";
      result.medium = "braille";
    } else if (normalized.includes("large print")) {
      result.format = "book";
      result.medium = "large_print";
    } else {
      result.format = "book";
      result.medium =
        result.binding === "digital" ? "digital" : result.binding === "audio" ? "audio" : "print";
    }

    return result;
  }

  /**
   * Normalize binding type string
   */
  private normalizeBindingType(binding: string): FormatInfo["binding"] {
    const normalized = binding.toLowerCase();

    if (normalized.includes("hard")) return "hardcover";
    if (normalized.includes("paper") || normalized.includes("soft")) return "paperback";
    if (normalized.includes("mass")) return "mass_market";
    if (normalized.includes("board")) return "board_book";
    if (normalized.includes("spiral") || normalized.includes("coil")) return "spiral";
    if (normalized.includes("leather")) return "leather";
    if (normalized.includes("cloth")) return "cloth";
    if (normalized.includes("digital") || normalized.includes("ebook")) return "digital";
    if (normalized.includes("audio")) return "audio";

    return "other";
  }

  /**
   * Validate format information
   */
  private validateFormat(format: FormatInfo): FormatInfo {
    const result: FormatInfo = { ...format };

    // Ensure consistency between binding, format, and medium
    if (result.binding === "digital" && !result.medium) {
      result.medium = "digital";
    }
    if (result.binding === "audio" && !result.medium) {
      result.medium = "audio";
    }
    if (result.format === "ebook" && !result.medium) {
      result.medium = "digital";
    }
    if (result.format === "audiobook" && !result.medium) {
      result.medium = "audio";
    }

    return result;
  }

  /**
   * Parse language strings like "en", "English", "en-US", "eng"
   */
  private parseLanguageString(langStr: string): LanguageInfo | null {
    const trimmed = langStr.trim();
    if (!trimmed || trimmed.length < 2) return null;

    // Extract region from input like "en-US" or "fr_CA"
    const regionMatch = trimmed.match(/^([a-z]{2,3})[-_]([a-z]{2})$/i);
    const region = regionMatch ? regionMatch[2].toUpperCase() : undefined;

    // Use the languages package for resolution
    const resolved = resolveLanguage(trimmed);

    if (resolved) {
      // Confidence based on match type
      const confidence =
        resolved.matchType === "iso3" || resolved.matchType === "iso1"
          ? 0.9
          : resolved.matchType === "regional"
            ? 0.85
            : resolved.matchType === "name"
              ? 0.8
              : 0.7;

      return { code: resolved.iso3, name: resolved.name, region, confidence, raw: langStr };
    }

    // Fallback - return as-is with low confidence
    return { code: trimmed.toLowerCase(), name: langStr, confidence: 0.3, raw: langStr };
  }

  /**
   * Validate language information object
   */
  private validateLanguageInfo(lang: LanguageInfo): LanguageInfo | null {
    if (!lang.code) return null;

    const result: LanguageInfo = { ...lang };

    // Normalize code to ISO 639-3 if possible using the languages package
    const resolved = resolveLanguage(result.code);
    if (resolved) {
      result.code = resolved.iso3;
      if (!result.name) result.name = resolved.name;
    }

    // Ensure confidence is set based on whether we could resolve the code
    if (result.confidence === undefined) {
      const langData = getLanguageByIso3(result.code);
      result.confidence = langData ? 0.8 : 0.5;
    }

    return result;
  }

  /**
   * Reconcile dimensions from multiple sources
   */
  private reconcileDimensions(
    inputs: PhysicalDescriptionInput[],
  ): ReconciledField<PhysicalDimensions> {
    const dimensionsList = inputs
      .map((input) => ({
        dimensions: input.dimensions ? this.normalizeDimensions(input.dimensions) : undefined,
        source: input.source,
      }))
      .filter(
        (item) => item.dimensions && (item.dimensions.width || item.dimensions.height),
      ) as Array<{ dimensions: PhysicalDimensions; source: MetadataSource }>;

    if (dimensionsList.length === 0) {
      return {
        value: {},
        confidence: 0,
        sources: inputs.map((i) => i.source),
        reasoning: "No valid dimensions found",
      };
    }

    if (dimensionsList.length === 1) {
      return {
        value: dimensionsList[0].dimensions,
        confidence: dimensionsList[0].source.reliability * 0.7,
        sources: [dimensionsList[0].source],
        reasoning: "Single dimensions source",
      };
    }

    // Find the most complete and reliable dimensions
    const scored = dimensionsList
      .map((item) => {
        const completeness =
          [item.dimensions.width, item.dimensions.height, item.dimensions.depth].filter(
            (d) => d !== undefined,
          ).length / 3;
        const score = item.source.reliability * completeness;

        return { ...item, score };
      })
      .sort((a, b) => b.score - a.score);

    return {
      value: scored[0].dimensions,
      confidence: scored[0].score * 0.8,
      sources: [scored[0].source],
      reasoning: `Selected most complete dimensions from ${dimensionsList.length} sources`,
    };
  }

  /**
   * Reconcile formats from multiple sources
   */
  private reconcileFormats(inputs: PhysicalDescriptionInput[]): ReconciledField<FormatInfo> {
    const formatsList = inputs
      .map((input) => ({
        format: input.format
          ? this.normalizeFormat(input.format, input.binding)
          : input.binding
            ? this.normalizeFormat("", input.binding)
            : undefined,
        source: input.source,
      }))
      .filter((item) => item.format) as Array<{ format: FormatInfo; source: MetadataSource }>;

    if (formatsList.length === 0) {
      return {
        value: { format: "book", medium: "print" },
        confidence: 0.3,
        sources: inputs.map((i) => i.source),
        reasoning: "No format information found, defaulting to print book",
      };
    }

    if (formatsList.length === 1) {
      return {
        value: formatsList[0].format,
        confidence: formatsList[0].source.reliability * 0.8,
        sources: [formatsList[0].source],
        reasoning: "Single format source",
      };
    }

    // Group by format consistency and select most reliable
    const bestFormat = formatsList.sort((a, b) => b.source.reliability - a.source.reliability)[0];

    return {
      value: bestFormat.format,
      confidence: bestFormat.source.reliability * 0.8,
      sources: [bestFormat.source],
      reasoning: `Selected format from most reliable of ${formatsList.length} sources`,
    };
  }

  /**
   * Reconcile languages from multiple sources
   */
  private reconcileLanguages(inputs: PhysicalDescriptionInput[]): ReconciledField<LanguageInfo[]> {
    const allLanguages: Array<{ languages: LanguageInfo[]; source: MetadataSource }> = [];

    for (const input of inputs) {
      if (input.languages) {
        const normalized = this.normalizeLanguages(input.languages);
        if (normalized.length > 0) {
          allLanguages.push({ languages: normalized, source: input.source });
        }
      }
    }

    if (allLanguages.length === 0) {
      return {
        value: [],
        confidence: 0,
        sources: inputs.map((i) => i.source),
        reasoning: "No language information found",
      };
    }

    // Deduplicate languages by code and merge information
    const languageMap = new Map<string, LanguageInfo>();
    const sources: MetadataSource[] = [];

    for (const { languages, source } of allLanguages) {
      sources.push(source);

      for (const lang of languages) {
        const existing = languageMap.get(lang.code);

        if (!existing || (lang.confidence || 0) > (existing.confidence || 0)) {
          languageMap.set(lang.code, {
            ...lang,
            confidence: Math.max(lang.confidence || 0, existing?.confidence || 0),
          });
        }
      }
    }

    const reconciledLanguages = Array.from(languageMap.values()).sort(
      (a, b) => (b.confidence || 0) - (a.confidence || 0),
    );

    const avgConfidence =
      reconciledLanguages.reduce((sum, lang) => sum + (lang.confidence || 0), 0) /
      reconciledLanguages.length;

    return {
      value: reconciledLanguages,
      confidence: Math.min(0.9, avgConfidence * 0.9),
      sources,
      reasoning: `Reconciled ${reconciledLanguages.length} unique languages from ${allLanguages.length} sources`,
    };
  }

  /**
   * Reconcile weights from multiple sources
   */
  private reconcileWeights(inputs: PhysicalDescriptionInput[]): ReconciledField<number> {
    const weights = inputs
      .map((input) => ({ weight: this.normalizeWeight(input.weight), source: input.source }))
      .filter((item) => item.weight !== undefined) as Array<{
      weight: number;
      source: MetadataSource;
    }>;

    if (weights.length === 0) {
      return {
        value: 0,
        confidence: 0,
        sources: inputs.map((i) => i.source),
        reasoning: "No weight information found",
      };
    }

    if (weights.length === 1) {
      return {
        value: weights[0].weight,
        confidence: weights[0].source.reliability * 0.7,
        sources: [weights[0].source],
        reasoning: "Single weight source",
      };
    }

    // Calculate weighted average
    const totalReliability = weights.reduce((sum, item) => sum + item.source.reliability, 0);
    const weightedSum = weights.reduce(
      (sum, item) => sum + item.weight * item.source.reliability,
      0,
    );
    const averageWeight = Math.round(weightedSum / totalReliability);

    return {
      value: averageWeight,
      confidence: Math.min(0.8, (totalReliability / weights.length) * 0.8),
      sources: weights.map((item) => item.source),
      reasoning: `Averaged ${weights.length} weight measurements`,
    };
  }

  /**
   * Normalize weight from various input formats
   */
  private normalizeWeight(input: number | string | undefined): number | undefined {
    if (input === undefined) return undefined;

    if (typeof input === "number") {
      return input > 0 && input < 50000 ? Math.round(input) : undefined;
    }

    if (typeof input === "string") {
      // Extract weight from strings like "500g", "1.2 kg", "2 lbs"
      const match = input.match(/(\d+(?:\.\d+)?)\s*(g|kg|lb|lbs|oz|ounces?)/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2].toLowerCase();

        // Convert to grams
        let grams = value;
        if (unit.startsWith("kg")) grams *= 1000;
        else if (unit.startsWith("lb")) grams *= 453.592;
        else if (unit.startsWith("oz")) grams *= 28.3495;

        return grams > 0 && grams < 50000 ? Math.round(grams) : undefined;
      }
    }

    return undefined;
  }
}
