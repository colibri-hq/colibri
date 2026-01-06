/**
 * Work and Edition reconciliation
 *
 * This reconciler handles the distinction between:
 * - **Work**: The abstract intellectual or artistic creation (e.g., "1984" by George Orwell)
 * - **Edition**: A specific published manifestation of a work (e.g., Penguin Classics 2003 edition)
 *
 * Responsibilities:
 * - Identify when multiple editions represent the same work
 * - Cluster editions by work identity
 * - Handle translations as related works vs editions
 * - Reconcile work-level metadata from edition metadata
 * - Link to external work identifiers (OpenLibrary work ID, WikiData Q ID)
 */

import type {
  Edition,
  Identifier,
  MetadataSource,
  ReconciledField,
  ReconciledWorkEdition,
  RelatedWork,
  Work,
  WorkEditionInput,
} from "./types.js";

/**
 * Configuration for work/edition reconciliation
 */
export interface WorkReconciliationConfig {
  /** Fuzzy matching threshold for titles (0.0 to 1.0) */
  titleMatchThreshold: number;
  /** Consider translations as separate works or editions */
  translationsAreSeparateWorks: boolean;
  /** Minimum number of matching authors to consider same work */
  minAuthorMatches: number;
  /** Weight given to external identifiers in matching */
  identifierMatchWeight: number;
}

/**
 * Work clustering result
 */
export interface WorkCluster {
  /** The identified work */
  work: Work;
  /** All editions of this work */
  editions: Edition[];
  /** Confidence in the work identification */
  confidence: number;
  /** How the work was identified */
  identificationMethod:
    | "external_id"
    | "title_author_match"
    | "isbn_family"
    | "fuzzy_match";
}

/**
 * Edition comparison result
 */
export interface EditionComparison {
  /** Whether the editions represent the same work */
  isSameWork: boolean;
  /** Confidence in the determination */
  confidence: number;
  /** Evidence for the determination */
  evidence: {
    titleSimilarity: number;
    authorOverlap: number;
    externalIdMatch: boolean;
    languageMatch: boolean;
    isbnFamily: boolean;
  };
  /** Relationship type if not the same work */
  relationship?: "translation" | "adaptation" | "revision" | "unrelated";
}

/**
 * Default configuration
 */
export const DEFAULT_WORK_CONFIG: WorkReconciliationConfig = {
  titleMatchThreshold: 0.85,
  translationsAreSeparateWorks: false, // Treat translations as editions
  minAuthorMatches: 1,
  identifierMatchWeight: 0.8,
};

/**
 * WorkReconciler handles work-level vs edition-level metadata reconciliation
 *
 * Key concepts:
 * - A **work** is language-independent (e.g., "Le Petit Prince" and "The Little Prince" are the same work)
 * - An **edition** is a specific publication (e.g., Harcourt 2000 edition vs Penguin 2015 edition)
 * - Translations can be treated as editions or separate works based on configuration
 *
 * @example
 * ```typescript
 * const reconciler = new WorkReconciler();
 *
 * // Identify works from edition data
 * const editions = [
 *   { title: "1984", language: "en", authors: ["George Orwell"], ... },
 *   { title: "Nineteen Eighty-Four", language: "en", authors: ["Orwell, George"], ... },
 *   { title: "1984", language: "fr", authors: ["George Orwell"], ... }, // Translation
 * ];
 *
 * const clusters = reconciler.clusterEditionsByWork(editions);
 * // Results in 1 or 2 clusters depending on translationsAreSeparateWorks
 * ```
 */
export class WorkReconciler {
  private config: WorkReconciliationConfig;

  constructor(config: Partial<WorkReconciliationConfig> = {}) {
    this.config = { ...DEFAULT_WORK_CONFIG, ...config };
  }

  /**
   * Reconcile work and edition information from multiple sources
   *
   * This is the main entry point for work/edition reconciliation. It:
   * 1. Extracts work and edition data from inputs
   * 2. Identifies the canonical work
   * 3. Clusters editions by work
   * 4. Determines relationships between works
   *
   * @param inputs - Work/edition data from various sources
   * @returns Reconciled work and edition information
   */
  reconcileWorkEdition(inputs: WorkEditionInput[]): ReconciledWorkEdition {
    if (inputs.length === 0) {
      throw new Error("No work/edition inputs provided");
    }

    // Extract all editions from inputs
    const allEditions = this.extractEditions(inputs);

    // Cluster editions by work
    const clusters = this.clusterEditionsByWork(allEditions);

    // Select the primary work cluster (highest confidence)
    const primaryCluster = this.selectPrimaryCluster(clusters);

    // Reconcile work-level metadata
    const work = this.reconcileWork(
      primaryCluster.editions,
      inputs.map((i) => i.source),
    );

    // Select canonical edition (usually first or most complete)
    const edition = this.reconcileEdition(
      primaryCluster.editions,
      inputs.map((i) => i.source),
    );

    // Identify related works (translations, adaptations, etc.)
    const relatedWorks = this.identifyRelatedWorks(
      primaryCluster,
      clusters.filter((c) => c !== primaryCluster),
      inputs,
    );

    return {
      work,
      edition,
      relatedWorks,
    };
  }

  /**
   * Cluster editions by work identity
   *
   * This method groups editions that represent the same work. It uses:
   * - External work IDs (OpenLibrary, WikiData)
   * - Title + author matching
   * - ISBN family analysis (ISBNs that differ only in check digit)
   * - Fuzzy title matching for typos/variations
   *
   * @param editions - List of editions to cluster
   * @returns Work clusters with confidence scores
   */
  clusterEditionsByWork(editions: Edition[]): WorkCluster[] {
    const clusters: WorkCluster[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < editions.length; i++) {
      if (processed.has(i)) continue;

      const cluster: WorkCluster = {
        work: this.editionToWork(editions[i]),
        editions: [editions[i]],
        confidence: 1.0,
        identificationMethod: "external_id",
      };

      processed.add(i);

      // Find matching editions
      for (let j = i + 1; j < editions.length; j++) {
        if (processed.has(j)) continue;

        const comparison = this.compareEditions(editions[i], editions[j]);

        if (comparison.isSameWork) {
          cluster.editions.push(editions[j]);
          cluster.confidence = Math.min(
            cluster.confidence,
            comparison.confidence,
          );
          processed.add(j);

          // Update identification method based on evidence
          if (comparison.evidence.externalIdMatch) {
            cluster.identificationMethod = "external_id";
          } else if (
            cluster.identificationMethod !== "external_id" &&
            comparison.evidence.isbnFamily
          ) {
            cluster.identificationMethod = "isbn_family";
          } else if (
            cluster.identificationMethod === "fuzzy_match" &&
            comparison.evidence.titleSimilarity > 0.95
          ) {
            cluster.identificationMethod = "title_author_match";
          }
        }
      }

      clusters.push(cluster);
    }

    return clusters.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Compare two editions to determine if they represent the same work
   *
   * @param edition1 - First edition
   * @param edition2 - Second edition
   * @returns Comparison result with confidence and evidence
   */
  compareEditions(edition1: Edition, edition2: Edition): EditionComparison {
    const evidence = {
      titleSimilarity: this.calculateTitleSimilarity(
        edition1.title || "",
        edition2.title || "",
      ),
      authorOverlap: this.calculateAuthorOverlap(edition1, edition2),
      externalIdMatch: this.checkExternalIdMatch(edition1, edition2),
      languageMatch: edition1.language === edition2.language,
      isbnFamily: this.checkIsbnFamily(edition1.isbn, edition2.isbn),
    };

    // External ID match is strongest signal
    if (evidence.externalIdMatch) {
      return {
        isSameWork: true,
        confidence: 0.95,
        evidence,
      };
    }

    // ISBN family match (different formats of same work)
    if (evidence.isbnFamily) {
      return {
        isSameWork: true,
        confidence: 0.9,
        evidence,
      };
    }

    // Title + author match with language consideration
    if (
      evidence.titleSimilarity >= this.config.titleMatchThreshold &&
      evidence.authorOverlap >= this.config.minAuthorMatches
    ) {
      // Different language = translation
      if (!evidence.languageMatch) {
        if (this.config.translationsAreSeparateWorks) {
          return {
            isSameWork: false,
            confidence: 0.85,
            evidence,
            relationship: "translation",
          };
        } else {
          return {
            isSameWork: true,
            confidence: 0.85,
            evidence,
          };
        }
      }

      // Same language = likely same work (different edition)
      return {
        isSameWork: true,
        confidence: 0.8,
        evidence,
      };
    }

    // Not enough evidence for same work
    return {
      isSameWork: false,
      confidence: 0.3,
      evidence,
      relationship: "unrelated",
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WorkReconciliationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): WorkReconciliationConfig {
    return { ...this.config };
  }

  /**
   * Extract editions from work/edition inputs
   */
  private extractEditions(inputs: WorkEditionInput[]): Edition[] {
    return inputs
      .filter((input) => input.edition)
      .map((input) => input.edition!);
  }

  /**
   * Convert an edition to a work (for initial clustering)
   */
  private editionToWork(edition: Edition): Work {
    return {
      id: edition.workId,
      title: edition.title || "",
      normalized: this.normalizeTitle(edition.title || ""),
      type: this.inferWorkType(edition),
      originalLanguage: edition.language,
      firstPublished: edition.publicationDate,
      identifiers: edition.identifiers,
    };
  }

  /**
   * Select the primary work cluster (highest confidence, most editions)
   */
  private selectPrimaryCluster(clusters: WorkCluster[]): WorkCluster {
    if (clusters.length === 0) {
      throw new Error("No work clusters found");
    }

    // Score clusters by confidence * number of editions
    const scored = clusters.map((cluster) => ({
      cluster,
      score: cluster.confidence * Math.log(cluster.editions.length + 1),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored[0].cluster;
  }

  /**
   * Reconcile work-level metadata from edition metadata
   */
  private reconcileWork(
    editions: Edition[],
    sources: MetadataSource[],
  ): ReconciledField<Work> {
    // Use earliest edition for original publication info
    const sortedByDate = [...editions].sort((a, b) => {
      if (!a.publicationDate || !b.publicationDate) return 0;
      const yearA = a.publicationDate.year || 9999;
      const yearB = b.publicationDate.year || 9999;
      return yearA - yearB;
    });

    const firstEdition = sortedByDate[0] || editions[0];

    const work: Work = {
      id: firstEdition.workId,
      title: firstEdition.title || "",
      normalized: this.normalizeTitle(firstEdition.title || ""),
      type: this.inferWorkType(firstEdition),
      originalLanguage: firstEdition.language,
      firstPublished: firstEdition.publicationDate,
      identifiers: this.mergeIdentifiers(editions),
    };

    // Calculate confidence based on source agreement
    const confidence = this.calculateWorkConfidence(editions, sources);

    return {
      value: work,
      confidence,
      sources,
      reasoning: `Identified work from ${editions.length} edition(s)`,
    };
  }

  // Helper methods

  /**
   * Reconcile edition-level metadata
   */
  private reconcileEdition(
    editions: Edition[],
    sources: MetadataSource[],
  ): ReconciledField<Edition> {
    // Select most complete edition as canonical
    const scored = editions.map((edition) => ({
      edition,
      completeness: this.calculateEditionCompleteness(edition),
    }));

    scored.sort((a, b) => b.completeness - a.completeness);

    const canonical = scored[0].edition;

    return {
      value: canonical,
      confidence: 0.8, // Edition-level confidence
      sources,
      reasoning: `Selected edition with highest completeness score`,
    };
  }

  /**
   * Identify related works (translations, sequels, etc.)
   */
  private identifyRelatedWorks(
    primaryCluster: WorkCluster,
    otherClusters: WorkCluster[],
    inputs: WorkEditionInput[],
  ): ReconciledField<RelatedWork[]> {
    const relatedWorks: RelatedWork[] = [];

    // Check other clusters for relationships
    for (const cluster of otherClusters) {
      const relationship = this.determineWorkRelationship(
        primaryCluster,
        cluster,
      );

      if (relationship) {
        relatedWorks.push({
          workId: cluster.work.id,
          title: cluster.work.title,
          relationshipType: relationship.type,
          description: relationship.description,
          confidence: relationship.confidence,
        });
      }
    }

    // Also check explicitly provided related works from inputs
    for (const input of inputs) {
      if (input.relatedWorks) {
        relatedWorks.push(...input.relatedWorks);
      }
    }

    // Deduplicate by work ID
    const seen = new Set<string>();
    const deduplicated = relatedWorks.filter((rw) => {
      if (!rw.workId) return true;
      if (seen.has(rw.workId)) return false;
      seen.add(rw.workId);
      return true;
    });

    return {
      value: deduplicated,
      confidence: 0.7,
      sources: inputs.map((i) => i.source),
      reasoning: `Found ${deduplicated.length} related work(s)`,
    };
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/^(the|a|an)\s+/i, "")
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private calculateTitleSimilarity(title1: string, title2: string): number {
    const norm1 = this.normalizeTitle(title1);
    const norm2 = this.normalizeTitle(title2);

    if (norm1 === norm2) return 1.0;

    // Levenshtein distance
    return this.levenshteinSimilarity(norm1, norm2);
  }

  private levenshteinSimilarity(str1: string, str2: string): number {
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
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + cost,
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len2][len1]) / maxLen;
  }

  private calculateAuthorOverlap(_edition1: Edition, _edition2: Edition): number {
    // TODO: Implement author overlap calculation
    // This should normalize author names and count matches
    return 0;
  }

  private checkExternalIdMatch(edition1: Edition, edition2: Edition): boolean {
    if (!edition1.workId || !edition2.workId) return false;
    return edition1.workId === edition2.workId;
  }

  private checkIsbnFamily(
    isbn1: string[] | undefined,
    isbn2: string[] | undefined,
  ): boolean {
    if (!isbn1 || !isbn2) return false;

    // Check for ISBN-10/ISBN-13 pairs
    for (const i1 of isbn1) {
      for (const i2 of isbn2) {
        if (this.areIsbnFamily(i1, i2)) return true;
      }
    }

    return false;
  }

  private areIsbnFamily(isbn1: string, isbn2: string): boolean {
    // Remove hyphens and spaces
    const clean1 = isbn1.replace(/[-\s]/g, "");
    const clean2 = isbn2.replace(/[-\s]/g, "");

    // ISBN-10 and ISBN-13 are family if they share the same base
    if (clean1.length === 10 && clean2.length === 13) {
      return (
        clean2.startsWith("978") && clean2.slice(3, 12) === clean1.slice(0, 9)
      );
    }

    if (clean2.length === 10 && clean1.length === 13) {
      return (
        clean1.startsWith("978") && clean1.slice(3, 12) === clean2.slice(0, 9)
      );
    }

    return false;
  }

  private inferWorkType(_edition: Edition): Work["type"] {
    // Infer from format or default to 'novel'
    // TODO: Add more sophisticated type inference
    return "novel";
  }

  private mergeIdentifiers(editions: Edition[]): Identifier[] {
    const identifiers: Identifier[] = [];
    const seen = new Set<string>();

    for (const edition of editions) {
      if (edition.identifiers) {
        for (const id of edition.identifiers) {
          const key = `${id.type}:${id.value}`;
          if (!seen.has(key)) {
            seen.add(key);
            identifiers.push(id);
          }
        }
      }
    }

    return identifiers;
  }

  private calculateWorkConfidence(
    editions: Edition[],
    sources: MetadataSource[],
  ): number {
    // Higher confidence with more sources and editions
    const sourceConfidence =
      sources.reduce((sum, s) => sum + s.reliability, 0) / sources.length;
    const editionBonus = Math.min(0.1, editions.length * 0.02);

    return Math.min(1.0, sourceConfidence + editionBonus);
  }

  private calculateEditionCompleteness(edition: Edition): number {
    let score = 0;
    const weights = {
      title: 0.2,
      format: 0.1,
      language: 0.1,
      publicationDate: 0.15,
      publisher: 0.15,
      isbn: 0.15,
      pageCount: 0.1,
      identifiers: 0.05,
    };

    if (edition.title) score += weights.title;
    if (edition.format) score += weights.format;
    if (edition.language) score += weights.language;
    if (edition.publicationDate) score += weights.publicationDate;
    if (edition.publisher) score += weights.publisher;
    if (edition.isbn && edition.isbn.length > 0) score += weights.isbn;
    if (edition.pageCount) score += weights.pageCount;
    if (edition.identifiers && edition.identifiers.length > 0)
      score += weights.identifiers;

    return score;
  }

  private determineWorkRelationship(
    cluster1: WorkCluster,
    cluster2: WorkCluster,
  ): {
    type: RelatedWork["relationshipType"];
    description: string;
    confidence: number;
  } | null {
    // Compare first editions from each cluster
    const edition1 = cluster1.editions[0];
    const edition2 = cluster2.editions[0];

    const comparison = this.compareEditions(edition1, edition2);

    if (comparison.relationship === "translation") {
      return {
        type: "translation",
        description: `Translation from ${edition1.language} to ${edition2.language}`,
        confidence: comparison.confidence,
      };
    }

    // TODO: Add detection for sequels, prequels, adaptations, etc.

    return null;
  }
}
