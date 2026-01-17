/**
 * Edition selection for metadata reconciliation
 *
 * This module provides functionality to select the best edition
 * from available metadata and identify alternative editions.
 */

import type { MetadataRecord } from "../providers/provider.js";
import type { MetadataPreview } from "./preview.js";
import type { Edition, EditionAlternative, EditionSelection } from "./types.js";

/**
 * Configuration for edition selection
 */
export interface EditionSelectorConfig {
  /** Prefer recent editions (published within this many years) */
  recentEditionYears: number;
  /** Maximum number of alternative editions to return */
  maxAlternatives: number;
}

/**
 * Default configuration for edition selection
 */
export const DEFAULT_EDITION_SELECTOR_CONFIG: EditionSelectorConfig = {
  recentEditionYears: 5,
  maxAlternatives: 3,
};

/**
 * EditionSelector chooses the best edition from available metadata
 *
 * @example
 * ```typescript
 * const selector = new EditionSelector();
 * const selection = selector.selectBestEdition(preview, rawMetadata);
 *
 * console.log(`Selected: ${selection.selectedEdition.title}`);
 * console.log(`Reason: ${selection.selectionReason}`);
 * ```
 */
export class EditionSelector {
  private readonly config: EditionSelectorConfig;

  constructor(config: Partial<EditionSelectorConfig> = {}) {
    this.config = { ...DEFAULT_EDITION_SELECTOR_CONFIG, ...config };
  }

  /**
   * Select the best edition from available metadata
   *
   * @param preview - The reconciled metadata preview
   * @param rawMetadata - Raw metadata records from providers
   * @returns Edition selection with alternatives
   */
  selectBestEdition(preview: MetadataPreview, rawMetadata: MetadataRecord[]): EditionSelection {
    // Extract all available editions from raw metadata
    const availableEditions: Edition[] = [];

    for (const record of rawMetadata) {
      if (record.edition) {
        availableEditions.push(record.edition as Edition);
      }
    }

    // If no explicit editions, create one from the reconciled data
    if (availableEditions.length === 0) {
      const defaultEdition = this.createDefaultEdition(preview);
      availableEditions.push(defaultEdition);
    }

    // Score each edition
    const scoredEditions = availableEditions.map((edition) => ({
      edition,
      score: this.scoreEdition(edition, preview),
    }));

    // Sort by score (highest first)
    scoredEditions.sort((a, b) => b.score - a.score);

    const selectedEdition = scoredEditions[0].edition;
    const alternatives: EditionAlternative[] = scoredEditions
      .slice(1, this.config.maxAlternatives + 1)
      .map((scored) => ({
        edition: scored.edition,
        reason: this.getEditionAlternativeReason(scored.edition, selectedEdition),
        confidence: scored.score,
        advantages: this.getEditionAdvantages(scored.edition, selectedEdition),
      }));

    return {
      selectedEdition,
      availableEditions,
      selectionReason: this.getEditionSelectionReason(selectedEdition, scoredEditions[0].score),
      confidence: scoredEditions[0].score,
      alternatives,
    };
  }

  /**
   * Score an edition based on various factors
   */
  scoreEdition(edition: Edition, preview: MetadataPreview): number {
    let score = 0.5; // Base score

    // Prefer editions with more complete information
    if (edition.isbn && edition.isbn.length > 0) score += 0.1;
    if (edition.publicationDate) score += 0.1;
    if (edition.publisher) score += 0.1;
    if (edition.pageCount) score += 0.05;
    if (edition.format) score += 0.05;

    // Prefer newer editions (if publication date available)
    if (edition.publicationDate?.year) {
      const currentYear = new Date().getFullYear();
      const ageYears = currentYear - edition.publicationDate.year;
      if (ageYears < this.config.recentEditionYears) {
        score += 0.1; // Recent edition
      } else if (ageYears < this.config.recentEditionYears * 2) {
        score += 0.05; // Moderately recent
      }
    }

    // Prefer standard formats
    if (edition.format?.binding === "hardcover") score += 0.05;
    else if (edition.format?.binding === "paperback") score += 0.03;

    // Prefer editions that match the preview language
    if (edition.language === preview.language.value) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Get reason for edition selection
   */
  getEditionSelectionReason(edition: Edition, score: number): string {
    const reasons: string[] = [];

    if (edition.isbn && edition.isbn.length > 0) {
      reasons.push("has ISBN information");
    }
    if (edition.publicationDate) {
      reasons.push("has publication date");
    }
    if (edition.publisher) {
      reasons.push("has publisher information");
    }
    if (score > 0.8) {
      reasons.push("most complete metadata");
    }

    return reasons.length > 0
      ? `Selected because it ${reasons.join(", ")}`
      : "Selected as the most suitable edition based on available data";
  }

  /**
   * Get reason why an edition might be an alternative
   */
  getEditionAlternativeReason(alternative: Edition, selected: Edition): string {
    if (alternative.format?.binding === "hardcover" && selected.format?.binding !== "hardcover") {
      return "Hardcover edition might be preferred";
    }
    if (alternative.publicationDate?.year && selected.publicationDate?.year) {
      if (alternative.publicationDate.year > selected.publicationDate.year) {
        return "More recent edition";
      }
      if (alternative.publicationDate.year < selected.publicationDate.year) {
        return "Original/earlier edition";
      }
    }
    return "Alternative edition with different characteristics";
  }

  /**
   * Get advantages of an alternative edition
   */
  getEditionAdvantages(alternative: Edition, selected: Edition): string[] {
    const advantages: string[] = [];

    if (alternative.format?.binding === "hardcover" && selected.format?.binding !== "hardcover") {
      advantages.push("Hardcover binding");
    }
    if (alternative.pageCount && selected.pageCount && alternative.pageCount > selected.pageCount) {
      advantages.push("More pages (possibly unabridged)");
    }
    if (alternative.publicationDate?.year && selected.publicationDate?.year) {
      if (alternative.publicationDate.year > selected.publicationDate.year) {
        advantages.push("More recent publication");
      }
    }

    return advantages;
  }

  /**
   * Create a default edition from the preview
   */
  private createDefaultEdition(preview: MetadataPreview): Edition {
    return {
      id: `edition-${Date.now()}`,
      title: preview.title.value || undefined,
      format: preview.physicalDescription.value?.format,
      language: preview.language.value || undefined,
      publicationDate: preview.publicationDate.value ?? undefined,
      publisher: preview.publisher.value ?? undefined,
      isbn: preview.isbn.value ?? undefined,
      pageCount: preview.physicalDescription.value?.pageCount,
      identifiers: preview.identifiers.value ?? undefined,
    };
  }
}
