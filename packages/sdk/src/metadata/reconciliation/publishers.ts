import type {
  Conflict,
  MetadataSource,
  PublicationInfoInput,
  Publisher,
  ReconciledField,
} from "./types.js";

/**
 * Normalizes and deduplicates publisher names
 */
export class PublisherReconciler {
  private readonly commonAbbreviations = new Map([
    ["inc", "incorporated"],
    ["corp", "corporation"],
    ["co", "company"],
    ["ltd", "limited"],
    ["llc", "limited liability company"],
    ["pub", "publishing"],
    ["publ", "publishing"],
    ["publs", "publishing"],
    ["publishers", "publishing"],
    ["press", "press"],
    ["books", "books"],
    ["book", "books"],
    ["univ", "university"],
    ["u", "university"],
    ["assoc", "association"],
    ["assn", "association"],
    ["soc", "society"],
    ["inst", "institute"],
    ["intl", "international"],
    ["natl", "national"],
    ["acad", "academic"],
    ["ed", "edition"],
    ["eds", "editions"],
    ["rev", "revised"],
    ["new", "new"],
    ["old", "old"],
    ["orig", "original"],
    ["repr", "reprint"],
    ["trans", "translated"],
    ["transl", "translated"],
    ["vol", "volume"],
    ["vols", "volumes"],
    ["ser", "series"],
    ["no", "number"],
    ["pt", "part"],
    ["ch", "chapter"],
    ["sect", "section"],
    ["div", "division"],
    ["dept", "department"],
    ["min", "ministry"],
    ["govt", "government"],
    ["gov", "government"],
    ["fed", "federal"],
    ["state", "state"],
    ["prov", "provincial"],
    ["reg", "regional"],
    ["loc", "local"],
    ["mun", "municipal"],
    ["dist", "district"],
    ["cty", "county"],
    ["twp", "township"],
    ["bor", "borough"],
    ["city", "city"],
    ["town", "town"],
    ["vill", "village"],
  ]);

  private readonly publisherVariations = new Map([
    // Major publishers with common variations
    [
      "penguin random house",
      ["penguin", "random house", "bantam", "dell", "doubleday", "knopf", "pantheon", "vintage"],
    ],
    [
      "harpercollins",
      ["harper", "collins", "harper & row", "harper collins", "harpercollins publishers"],
    ],
    [
      "simon & schuster",
      ["simon and schuster", "simon schuster", "scribner", "atria", "pocket books"],
    ],
    [
      "macmillan",
      ["macmillan publishers", "st. martins press", "farrar straus giroux", "henry holt", "tor"],
    ],
    ["hachette", ["hachette book group", "little brown", "grand central", "orbit", "yen press"]],
    ["oxford university press", ["oxford", "oup", "oxford univ press", "oxford university"]],
    [
      "cambridge university press",
      ["cambridge", "cup", "cambridge univ press", "cambridge university"],
    ],
    ["harvard university press", ["harvard", "harvard univ press", "harvard university"]],
    ["yale university press", ["yale", "yale univ press", "yale university"]],
    ["princeton university press", ["princeton", "princeton univ press", "princeton university"]],
    ["university of chicago press", ["chicago", "univ of chicago", "university chicago"]],
    ["mit press", ["massachusetts institute of technology", "mit", "mass inst tech"]],
    ["norton", ["w. w. norton", "ww norton", "norton & company"]],
    ["wiley", ["john wiley", "wiley & sons", "wiley-blackwell", "jossey-bass"]],
    ["springer", ["springer-verlag", "springer nature", "springer science"]],
    ["elsevier", ["elsevier science", "academic press", "morgan kaufmann"]],
    ["pearson", ["pearson education", "addison-wesley", "prentice hall", "benjamin cummings"]],
    ["mcgraw-hill", ["mcgraw hill", "mcgraw-hill education", "mcgraw hill education"]],
    ["cengage", ["cengage learning", "thomson", "wadsworth", "brooks/cole"]],
    ["sage", ["sage publications", "sage publishing"]],
    ["routledge", ["taylor & francis", "taylor and francis", "crc press"]],
    ["bloomsbury", ["bloomsbury publishing", "bloomsbury academic"]],
    ["scholastic", ["scholastic inc", "scholastic press", "scholastic corporation"]],
  ]);

  /**
   * Normalize a publisher string or object into a standardized Publisher
   */
  normalizePublisher(input: string | Publisher): Publisher {
    if (typeof input === "object" && input !== null) {
      return {
        name: input.name,
        normalized: input.normalized || this.normalizePublisherName(input.name),
        location: input.location,
      };
    }

    const normalized = this.normalizePublisherName(input);
    return { name: input, normalized };
  }

  /**
   * Reconcile multiple publishers using deduplication and conflict resolution
   */
  reconcilePublishers(inputs: PublicationInfoInput[]): ReconciledField<Publisher> {
    if (inputs.length === 0) {
      throw new Error("No publishers to reconcile");
    }

    // Normalize all publishers
    const normalizedPublishers = inputs
      .filter((input) => {
        if (!input.publisher) return false;
        const publisherStr =
          typeof input.publisher === "string" ? input.publisher : input.publisher.name;
        return publisherStr && publisherStr.trim() !== "";
      })
      .map((input) => ({
        publisher: this.normalizePublisher(input.publisher!),
        source: input.source,
      }));

    if (normalizedPublishers.length === 0) {
      throw new Error("No valid publishers found");
    }

    if (normalizedPublishers.length === 1) {
      const publisher = normalizedPublishers[0];
      return {
        value: publisher.publisher,
        confidence: this.calculatePublisherConfidence(publisher.publisher, publisher.source),
        sources: [publisher.source],
        reasoning: "Single valid publisher",
      };
    }

    // Group by normalized name
    const publisherGroups = new Map<string, typeof normalizedPublishers>();
    for (const item of normalizedPublishers) {
      const key = item.publisher.normalized || item.publisher.name.toLowerCase();
      if (!publisherGroups.has(key)) {
        publisherGroups.set(key, []);
      }
      publisherGroups.get(key)!.push(item);
    }

    // Check for conflicts
    const conflicts: Conflict[] = [];
    if (publisherGroups.size > 1) {
      conflicts.push({
        field: "publisher",
        values: Array.from(publisherGroups.values())
          .flat()
          .map((item) => ({ value: item.publisher, source: item.source })),
        resolution: "Selected publisher from most reliable source",
      });
    }

    // Select the best publisher (highest reliability)
    const allCandidates = Array.from(publisherGroups.values()).flat();
    const bestCandidate = allCandidates.reduce((best, current) =>
      current.source.reliability > best.source.reliability ? current : best,
    );

    const confidence = this.calculatePublisherConfidence(
      bestCandidate.publisher,
      bestCandidate.source,
    );

    return {
      value: bestCandidate.publisher,
      confidence,
      sources: [bestCandidate.source],
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      reasoning:
        conflicts.length > 0
          ? "Resolved conflict by selecting publisher from most reliable source"
          : "Selected publisher from most reliable source",
    };
  }

  /**
   * Normalize a publisher name string
   */
  private normalizePublisherName(name: string): string {
    if (!name || typeof name !== "string") {
      return "";
    }

    let normalized = name.toLowerCase().trim();

    // Remove common prefixes and suffixes
    normalized = normalized
      .replace(/^(the\s+|a\s+|an\s+)/i, "") // Remove articles
      .replace(/\s+(inc\.?|corp\.?|co\.?|ltd\.?|llc)$/i, "") // Remove corporate suffixes
      .replace(
        /\s+(publishers?|publishing|press|books?|company)(\s+(inc\.?|corp\.?|co\.?|ltd\.?|llc))?$/i,
        "",
      ) // Remove publishing suffixes
      .replace(/\s+(publishers?|publishing|press|books?|company)$/i, "") // Remove remaining publishing suffixes
      .replace(/[^\w\s&-]/g, "") // Remove special characters except &, -, and spaces
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    // Expand common abbreviations
    const words = normalized.split(/\s+/);
    const expandedWords = words.map((word) => {
      const cleanWord = word.replace(/[^\w]/g, "");
      return this.commonAbbreviations.get(cleanWord) || word;
    });
    normalized = expandedWords.join(" ");

    // Check for known publisher variations
    for (const [canonical, variations] of this.publisherVariations.entries()) {
      if (
        variations.some(
          (variation) =>
            normalized.includes(variation) || this.calculateSimilarity(normalized, variation) > 0.8,
        )
      ) {
        return canonical;
      }
    }

    return normalized;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
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
   * Calculate confidence score for a publisher
   */
  private calculatePublisherConfidence(publisher: Publisher, source: MetadataSource): number {
    let confidence = source.reliability;

    // Adjust based on publisher name quality
    if (!publisher.name || publisher.name.trim().length === 0) {
      confidence *= 0.1;
    } else if (publisher.name.trim().length < 3) {
      confidence *= 0.5;
    } else if (publisher.normalized && publisher.normalized !== publisher.name.toLowerCase()) {
      // Publisher was successfully normalized to a known publisher
      confidence *= 1.1;
    }

    // Boost confidence for well-known publishers
    if (publisher.normalized && this.publisherVariations.has(publisher.normalized)) {
      confidence *= 1.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}
