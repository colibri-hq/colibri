import type { MultiCriteriaQuery } from "../providers/provider.js";

/**
 * Rules for relaxing query criteria
 */
export interface RelaxationRule {
  /** Name of the rule for debugging */
  name: string;
  /** Description of what this rule does */
  description: string;
  /** Function to apply the relaxation */
  apply: (query: MultiCriteriaQuery) => MultiCriteriaQuery;
  /** Priority of this rule (lower = applied first) */
  priority: number;
}

/**
 * Configuration for query strategy building
 */
export interface QueryStrategyConfig {
  /** Maximum number of fallback queries to generate */
  maxFallbacks: number;
  /** Whether to enable fuzzy matching in fallbacks */
  enableFuzzyMatching: boolean;
  /** Whether to remove language constraints in fallbacks */
  relaxLanguage: boolean;
  /** Whether to broaden author search in fallbacks */
  relaxAuthors: boolean;
  /** Whether to remove subject constraints in fallbacks */
  relaxSubjects: boolean;
  /** Whether to remove publisher constraints in fallbacks */
  relaxPublisher: boolean;
  /** Whether to broaden year range in fallbacks */
  relaxYearRange: boolean;
}

/**
 * Query strategy with primary and fallback queries
 */
export interface QueryStrategy {
  primary: MultiCriteriaQuery;
  fallbacks: MultiCriteriaQuery[];
  relaxationRules: RelaxationRule[];
}

/**
 * Result quality assessment for determining if fallbacks should be used
 */
export interface QualityAssessment {
  /** Number of results found */
  resultCount: number;
  /** Average confidence of results */
  averageConfidence: number;
  /** Whether results meet quality threshold */
  meetsThreshold: boolean;
  /** Reason for quality assessment */
  reason: string;
}

/**
 * QueryStrategyBuilder creates progressive query relaxation strategies
 * to improve recall when strict queries return no or poor results.
 */
export class QueryStrategyBuilder {
  private config: QueryStrategyConfig;
  private relaxationRules: RelaxationRule[];

  constructor(config: Partial<QueryStrategyConfig> = {}) {
    this.config = {
      maxFallbacks: 5,
      enableFuzzyMatching: true,
      relaxLanguage: true,
      relaxAuthors: true,
      relaxSubjects: true,
      relaxPublisher: true,
      relaxYearRange: true,
      ...config,
    };

    this.relaxationRules = this.createDefaultRelaxationRules();
  }

  /**
   * Build a query strategy with progressive relaxation
   */
  buildStrategy(query: MultiCriteriaQuery): QueryStrategy {
    const fallbacks: MultiCriteriaQuery[] = [];
    let currentQuery = { ...query };

    // Apply relaxation rules progressively
    const applicableRules = this.relaxationRules
      .filter((rule) => this.isRuleApplicable(rule, query))
      .sort((a, b) => a.priority - b.priority);

    for (const rule of applicableRules) {
      if (fallbacks.length >= this.config.maxFallbacks) {
        break;
      }

      const relaxedQuery = rule.apply(currentQuery);

      // Only add if the query actually changed
      if (!this.queriesEqual(currentQuery, relaxedQuery)) {
        fallbacks.push(relaxedQuery);
        currentQuery = relaxedQuery;
      }
    }

    return { primary: query, fallbacks, relaxationRules: applicableRules };
  }

  /**
   * Assess the quality of query results to determine if fallbacks should be used
   */
  assessResultQuality(
    results: Array<{ confidence: number }>,
    minResults: number = 1,
    minConfidence: number = 0.6,
  ): QualityAssessment {
    const resultCount = results.length;

    if (resultCount === 0) {
      return {
        resultCount: 0,
        averageConfidence: 0,
        meetsThreshold: false,
        reason: "No results found",
      };
    }

    const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / resultCount;
    const meetsThreshold = resultCount >= minResults && averageConfidence >= minConfidence;

    return {
      resultCount,
      averageConfidence,
      meetsThreshold,
      reason: meetsThreshold
        ? "Results meet quality threshold"
        : `Results below threshold: ${resultCount} results, ${averageConfidence.toFixed(2)} avg confidence`,
    };
  }

  /**
   * Add a custom relaxation rule
   */
  addRelaxationRule(rule: RelaxationRule): void {
    this.relaxationRules.push(rule);
    this.relaxationRules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove a relaxation rule by name
   */
  removeRelaxationRule(name: string): boolean {
    const index = this.relaxationRules.findIndex((rule) => rule.name === name);
    if (index >= 0) {
      this.relaxationRules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all relaxation rules
   */
  getRelaxationRules(): RelaxationRule[] {
    return [...this.relaxationRules];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<QueryStrategyConfig>): void {
    this.config = { ...this.config, ...config };
    // Recreate rules with new config
    this.relaxationRules = this.createDefaultRelaxationRules();
  }

  /**
   * Get current configuration
   */
  getConfig(): QueryStrategyConfig {
    return { ...this.config };
  }

  /**
   * Create default relaxation rules
   */
  private createDefaultRelaxationRules(): RelaxationRule[] {
    const rules: RelaxationRule[] = [];

    // Rule 1: Enable fuzzy matching
    if (this.config.enableFuzzyMatching) {
      rules.push({
        name: "enable-fuzzy",
        description: "Enable fuzzy matching for title and authors",
        priority: 1,
        apply: (query) => ({ ...query, fuzzy: true }),
      });
    }

    // Rule 2: Remove language constraint
    if (this.config.relaxLanguage) {
      rules.push({
        name: "remove-language",
        description: "Remove language constraint",
        priority: 2,
        apply: (query) => {
          const { language, ...rest } = query;
          return rest;
        },
      });
    }

    // Rule 3: Broaden author search (remove some authors if multiple)
    if (this.config.relaxAuthors) {
      rules.push({
        name: "broaden-authors",
        description: "Reduce number of required authors",
        priority: 3,
        apply: (query) => {
          if (query.authors && query.authors.length > 1) {
            return {
              ...query,
              authors: [query.authors[0]], // Keep only first author
            };
          }
          return query;
        },
      });
    }

    // Rule 4: Remove subjects constraint
    if (this.config.relaxSubjects) {
      rules.push({
        name: "remove-subjects",
        description: "Remove subject constraints",
        priority: 4,
        apply: (query) => {
          const { subjects, ...rest } = query;
          return rest;
        },
      });
    }

    // Rule 5: Remove publisher constraint
    if (this.config.relaxPublisher) {
      rules.push({
        name: "remove-publisher",
        description: "Remove publisher constraint",
        priority: 5,
        apply: (query) => {
          const { publisher, ...rest } = query;
          return rest;
        },
      });
    }

    // Rule 6: Broaden year range
    if (this.config.relaxYearRange) {
      rules.push({
        name: "broaden-year-range",
        description: "Broaden publication year range",
        priority: 6,
        apply: (query) => {
          if (query.yearRange) {
            const [start, end] = query.yearRange;
            const range = end - start;
            const expansion = Math.max(5, Math.floor(range * 0.5)); // Expand by 50% or 5 years minimum

            return {
              ...query,
              yearRange: [start - expansion, end + expansion] as [number, number],
            };
          }
          return query;
        },
      });
    }

    // Rule 7: Remove year range entirely
    rules.push({
      name: "remove-year-range",
      description: "Remove year range constraint entirely",
      priority: 7,
      apply: (query) => {
        const { yearRange, ...rest } = query;
        return rest;
      },
    });

    // Rule 8: Title-only search (most relaxed)
    rules.push({
      name: "title-only",
      description: "Search by title only",
      priority: 8,
      apply: (query) => {
        if (query.title) {
          return { title: query.title, fuzzy: true };
        }
        return query;
      },
    });

    return rules;
  }

  /**
   * Check if a relaxation rule is applicable to a query
   */
  private isRuleApplicable(rule: RelaxationRule, query: MultiCriteriaQuery): boolean {
    switch (rule.name) {
      case "enable-fuzzy":
        return !query.fuzzy && (!!query.title || !!query.authors);

      case "remove-language":
        return !!query.language;

      case "broaden-authors":
        return !!(query.authors && query.authors.length > 1);

      case "remove-subjects":
        return !!(query.subjects && query.subjects.length > 0);

      case "remove-publisher":
        return !!query.publisher;

      case "broaden-year-range":
        return !!query.yearRange;

      case "remove-year-range":
        return !!query.yearRange;

      case "title-only":
        return !!(
          query.title &&
          (query.authors || query.publisher || query.subjects || query.language || query.yearRange)
        );

      default:
        return true;
    }
  }

  /**
   * Compare two queries for equality
   */
  private queriesEqual(query1: MultiCriteriaQuery, query2: MultiCriteriaQuery): boolean {
    return (
      JSON.stringify(this.normalizeQuery(query1)) === JSON.stringify(this.normalizeQuery(query2))
    );
  }

  /**
   * Normalize query for comparison
   */
  private normalizeQuery(query: MultiCriteriaQuery): MultiCriteriaQuery {
    const normalized: MultiCriteriaQuery = {};

    // Sort arrays for consistent comparison
    if (query.title) normalized.title = query.title;
    if (query.authors) normalized.authors = [...query.authors].sort();
    if (query.isbn) normalized.isbn = query.isbn;
    if (query.language) normalized.language = query.language;
    if (query.subjects) normalized.subjects = [...query.subjects].sort();
    if (query.publisher) normalized.publisher = query.publisher;
    if (query.yearRange) normalized.yearRange = query.yearRange;
    if (query.fuzzy !== undefined) normalized.fuzzy = query.fuzzy;

    return normalized;
  }
}
