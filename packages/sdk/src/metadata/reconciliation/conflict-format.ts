import type {
  ConflictSeverity,
  ConflictSummary,
  ConflictType,
  DetailedConflict,
} from "./conflicts.js";
import type { MetadataSource } from "./types.js";

/**
 * Configuration for conflict display formatting
 */
export interface ConflictDisplayConfig {
  /** Whether to use colors in console output */
  useColors: boolean;
  /** Whether to show detailed explanations */
  showDetailedExplanations: boolean;
  /** Whether to show resolution suggestions */
  showResolutionSuggestions: boolean;
  /** Whether to show source information */
  showSourceInfo: boolean;
  /** Maximum width for text wrapping */
  maxWidth: number;
  /** Whether to group conflicts by field */
  groupByField: boolean;
  /** Whether to show auto-resolvable conflicts separately */
  separateAutoResolvable: boolean;
}

/**
 * Formatted conflict information for display
 */
export interface FormattedConflict {
  /** Unique identifier for this conflict */
  id: string;
  /** Human-readable title */
  title: string;
  /** Formatted description */
  description: string;
  /** Severity indicator */
  severityIndicator: string;
  /** Type indicator */
  typeIndicator: string;
  /** Formatted values showing the conflict */
  formattedValues: ConflictValueDisplay[];
  /** Resolution explanation */
  resolutionExplanation: string;
  /** Formatted suggestions */
  suggestions: string[];
  /** Impact summary */
  impactSummary: string;
  /** Whether this can be auto-resolved */
  canAutoResolve: boolean;
  /** Raw conflict data */
  rawConflict: DetailedConflict;
}

/**
 * Display information for conflicting values
 */
export interface ConflictValueDisplay {
  /** Formatted value string */
  value: string;
  /** Source information */
  source: SourceDisplay;
  /** Whether this is the chosen/resolved value */
  isResolved: boolean;
  /** Confidence indicator */
  confidenceIndicator: string;
}

/**
 * Display information for sources
 */
export interface SourceDisplay {
  /** Source name */
  name: string;
  /** Reliability indicator */
  reliabilityIndicator: string;
  /** Formatted reliability score */
  reliabilityText: string;
  /** Timestamp information */
  timestamp: string;
}

/**
 * Formatted summary for display
 */
export interface FormattedConflictSummary {
  /** Overall summary text */
  overallSummary: string;
  /** Severity breakdown */
  severityBreakdown: string;
  /** Type breakdown */
  typeBreakdown: string;
  /** Field breakdown */
  fieldBreakdown: string;
  /** Recommendations */
  recommendations: string[];
  /** Quick stats */
  quickStats: { total: number; critical: number; autoResolvable: number; manualReview: number };
}

/**
 * ConflictDisplayFormatter provides user-friendly formatting of conflict information
 */
export class ConflictDisplayFormatter {
  private config: ConflictDisplayConfig;

  // Color codes for console output
  private readonly colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
  };

  // Severity indicators
  private readonly severityIndicators = {
    critical: "🔴",
    major: "🟠",
    minor: "🟡",
    informational: "🔵",
  };

  // Type indicators
  private readonly typeIndicators = {
    value_mismatch: "⚡",
    format_difference: "📝",
    precision_difference: "🔍",
    completeness_difference: "📊",
    quality_difference: "⭐",
    temporal_difference: "⏰",
    source_disagreement: "🤝",
    normalization_conflict: "🔄",
  };

  constructor(config: Partial<ConflictDisplayConfig> = {}) {
    this.config = {
      useColors: true,
      showDetailedExplanations: true,
      showResolutionSuggestions: true,
      showSourceInfo: true,
      maxWidth: 80,
      groupByField: true,
      separateAutoResolvable: true,
      ...config,
    };
  }

  /**
   * Format a single conflict for display
   */
  formatConflict(conflict: DetailedConflict): FormattedConflict {
    const id = this.generateConflictId(conflict);
    const title = this.formatConflictTitle(conflict);
    const description = this.formatConflictDescription(conflict);
    const severityIndicator = this.formatSeverityIndicator(conflict.severity);
    const typeIndicator = this.formatTypeIndicator(conflict.type);
    const formattedValues = this.formatConflictValues(conflict);
    const resolutionExplanation = this.formatResolutionExplanation(conflict);
    const suggestions = this.formatSuggestions(conflict.resolutionSuggestions);
    const impactSummary = this.formatImpactSummary(conflict);

    return {
      id,
      title,
      description,
      severityIndicator,
      typeIndicator,
      formattedValues,
      resolutionExplanation,
      suggestions,
      impactSummary,
      canAutoResolve: conflict.autoResolvable,
      rawConflict: conflict,
    };
  }

  /**
   * Format multiple conflicts for display
   */
  formatConflicts(conflicts: DetailedConflict[]): FormattedConflict[] {
    return conflicts.map((conflict) => this.formatConflict(conflict));
  }

  /**
   * Format a conflict summary for display
   */
  formatConflictSummary(summary: ConflictSummary): FormattedConflictSummary {
    const overallSummary = this.formatOverallSummary(summary);
    const severityBreakdown = this.formatSeverityBreakdown(summary.bySeverity);
    const typeBreakdown = this.formatTypeBreakdown(summary.byType);
    const fieldBreakdown = this.formatFieldBreakdown(summary.byField);
    const recommendations = summary.recommendations;

    const quickStats = {
      total: summary.totalConflicts,
      critical: summary.bySeverity.critical.length,
      autoResolvable: summary.autoResolvableConflicts.length,
      manualReview: summary.manualConflicts.length,
    };

    return {
      overallSummary,
      severityBreakdown,
      typeBreakdown,
      fieldBreakdown,
      recommendations,
      quickStats,
    };
  }

  /**
   * Generate a comprehensive conflict report
   */
  generateConflictReport(summary: ConflictSummary): string {
    const formatted = this.formatConflictSummary(summary);
    const lines: string[] = [];

    // Header
    lines.push(this.colorize("=".repeat(this.config.maxWidth), "bright"));
    lines.push(this.colorize("METADATA CONFLICT ANALYSIS REPORT", "bright"));
    lines.push(this.colorize("=".repeat(this.config.maxWidth), "bright"));
    lines.push("");

    // Overall summary
    lines.push(this.colorize("📋 SUMMARY", "bright"));
    lines.push(this.wrapText(formatted.overallSummary));
    lines.push("");

    // Quick stats
    lines.push(this.colorize("📊 QUICK STATS", "bright"));
    lines.push(
      `Total Conflicts: ${this.colorize(formatted.quickStats.total.toString(), "yellow")}`,
    );
    lines.push(`Critical: ${this.colorize(formatted.quickStats.critical.toString(), "red")}`);
    lines.push(
      `Auto-Resolvable: ${this.colorize(formatted.quickStats.autoResolvable.toString(), "green")}`,
    );
    lines.push(
      `Manual Review: ${this.colorize(formatted.quickStats.manualReview.toString(), "yellow")}`,
    );
    lines.push("");

    // Severity breakdown
    if (formatted.quickStats.total > 0) {
      lines.push(this.colorize("🚨 SEVERITY BREAKDOWN", "bright"));
      lines.push(formatted.severityBreakdown);
      lines.push("");

      // Type breakdown
      lines.push(this.colorize("🔍 CONFLICT TYPES", "bright"));
      lines.push(formatted.typeBreakdown);
      lines.push("");

      // Field breakdown
      lines.push(this.colorize("📝 AFFECTED FIELDS", "bright"));
      lines.push(formatted.fieldBreakdown);
      lines.push("");
    }

    // Recommendations
    if (formatted.recommendations.length > 0) {
      lines.push(this.colorize("💡 RECOMMENDATIONS", "bright"));
      formatted.recommendations.forEach((rec) => {
        lines.push(`• ${this.wrapText(rec, 2)}`);
      });
      lines.push("");
    }

    // Detailed conflicts
    if (summary.totalConflicts > 0) {
      lines.push(this.colorize("🔍 DETAILED CONFLICTS", "bright"));
      lines.push("");

      if (this.config.separateAutoResolvable) {
        // Auto-resolvable conflicts first
        if (summary.autoResolvableConflicts.length > 0) {
          lines.push(this.colorize("✅ Auto-Resolvable Conflicts", "green"));
          lines.push("");
          summary.autoResolvableConflicts.forEach((conflict) => {
            lines.push(...this.formatDetailedConflict(conflict));
            lines.push("");
          });
        }

        // Manual conflicts
        if (summary.manualConflicts.length > 0) {
          lines.push(this.colorize("⚠️  Manual Review Required", "yellow"));
          lines.push("");
          summary.manualConflicts.forEach((conflict) => {
            lines.push(...this.formatDetailedConflict(conflict));
            lines.push("");
          });
        }
      } else {
        // All conflicts together
        const allConflicts = [
          ...summary.bySeverity.critical,
          ...summary.bySeverity.major,
          ...summary.bySeverity.minor,
          ...summary.bySeverity.informational,
        ];

        allConflicts.forEach((conflict) => {
          lines.push(...this.formatDetailedConflict(conflict));
          lines.push("");
        });
      }
    }

    return lines.join("\n");
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConflictDisplayConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ConflictDisplayConfig {
    return { ...this.config };
  }

  /**
   * Generate a conflict ID
   */
  private generateConflictId(conflict: DetailedConflict): string {
    const timestamp = conflict.detectionMetadata.detectedAt.getTime();
    const fieldHash = this.simpleHash(conflict.field);
    const typeHash = this.simpleHash(conflict.type);
    return `conflict-${timestamp}-${fieldHash}-${typeHash}`;
  }

  /**
   * Simple hash function for generating IDs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 6);
  }

  /**
   * Format conflict title
   */
  private formatConflictTitle(conflict: DetailedConflict): string {
    const severity = conflict.severity.toUpperCase();
    const field = conflict.field.replace(/([A-Z])/g, " $1").toLowerCase();
    return `${severity} conflict in ${field}`;
  }

  /**
   * Format conflict description
   */
  private formatConflictDescription(conflict: DetailedConflict): string {
    if (this.config.showDetailedExplanations) {
      return conflict.explanation;
    }
    return `${conflict.type.replace(/_/g, " ")} detected in ${conflict.field}`;
  }

  /**
   * Format severity indicator
   */
  private formatSeverityIndicator(severity: ConflictSeverity): string {
    const indicator = this.severityIndicators[severity];
    const color = this.getSeverityColor(severity);
    return this.colorize(`${indicator} ${severity.toUpperCase()}`, color);
  }

  /**
   * Format type indicator
   */
  private formatTypeIndicator(type: ConflictType): string {
    const indicator = this.typeIndicators[type];
    const displayType = type.replace(/_/g, " ").toUpperCase();
    return this.colorize(`${indicator} ${displayType}`, "cyan");
  }

  /**
   * Format conflicting values
   */
  private formatConflictValues(conflict: DetailedConflict): ConflictValueDisplay[] {
    return conflict.values.map((valueItem) => {
      const formattedValue = this.formatValue(valueItem.value);
      const source = this.formatSource(valueItem.source);
      const isResolved = false; // Would need additional logic to determine this
      const confidenceIndicator = this.formatConfidenceIndicator(valueItem.source.reliability);

      return { value: formattedValue, source, isResolved, confidenceIndicator };
    });
  }

  /**
   * Format a value for display
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return this.colorize("(empty)", "gray");
    }

    if (typeof value === "string") {
      return `"${value}"`;
    }

    if (typeof value === "number") {
      return value.toString();
    }

    if (typeof value === "boolean") {
      return value.toString();
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return this.colorize("[]", "gray");
      }
      const items = value.slice(0, 3).map((item) => this.formatValue(item));
      const display = items.join(", ");
      return value.length > 3 ? `[${display}, ...${value.length - 3} more]` : `[${display}]`;
    }

    if (typeof value === "object") {
      return this.formatObjectValue(value);
    }

    return String(value);
  }

  /**
   * Format an object value for display
   */
  private formatObjectValue(obj: any): string {
    if (!obj) return this.colorize("(null)", "gray");

    // Handle common object types
    if ("name" in obj) {
      return obj.name;
    }

    if ("title" in obj) {
      return obj.title;
    }

    if ("year" in obj) {
      const parts = [];
      if (obj.year) parts.push(obj.year);
      if (obj.month) parts.push(String(obj.month).padStart(2, "0"));
      if (obj.day) parts.push(String(obj.day).padStart(2, "0"));
      return parts.join("-");
    }

    // Generic object display
    const keys = Object.keys(obj).slice(0, 2);
    const pairs = keys.map((key) => `${key}: ${this.formatValue(obj[key])}`);
    const display = pairs.join(", ");
    return Object.keys(obj).length > 2 ? `{${display}, ...}` : `{${display}}`;
  }

  /**
   * Format source information
   */
  private formatSource(source: MetadataSource): SourceDisplay {
    const reliabilityIndicator = this.formatReliabilityIndicator(source.reliability);
    const reliabilityText = `${(source.reliability * 100).toFixed(0)}%`;
    const timestamp = source.timestamp.toISOString().split("T")[0];

    return { name: source.name, reliabilityIndicator, reliabilityText, timestamp };
  }

  /**
   * Format reliability indicator
   */
  private formatReliabilityIndicator(reliability: number): string {
    if (reliability >= 0.9) return this.colorize("⭐⭐⭐", "green");
    if (reliability >= 0.7) return this.colorize("⭐⭐", "yellow");
    if (reliability >= 0.5) return this.colorize("⭐", "yellow");
    return this.colorize("⚠️", "red");
  }

  /**
   * Format confidence indicator
   */
  private formatConfidenceIndicator(confidence: number): string {
    if (confidence >= 0.8) return this.colorize("HIGH", "green");
    if (confidence >= 0.6) return this.colorize("MEDIUM", "yellow");
    return this.colorize("LOW", "red");
  }

  /**
   * Format resolution explanation
   */
  private formatResolutionExplanation(conflict: DetailedConflict): string {
    const resolution = conflict.resolution;
    const autoText = conflict.autoResolvable
      ? this.colorize("(Auto-resolvable)", "green")
      : this.colorize("(Manual review required)", "yellow");

    return `${resolution} ${autoText}`;
  }

  /**
   * Format suggestions
   */
  private formatSuggestions(suggestions: string[]): string[] {
    if (!this.config.showResolutionSuggestions) {
      return [];
    }
    return suggestions.map((suggestion) => `• ${suggestion}`);
  }

  /**
   * Format impact summary
   */
  private formatImpactSummary(conflict: DetailedConflict): string {
    const impact = conflict.impact;
    const scoreText = `Impact: ${(impact.score * 100).toFixed(0)}%`;
    const areasText =
      impact.affectedAreas.length > 0 ? ` (affects: ${impact.affectedAreas.join(", ")})` : "";

    return `${scoreText}${areasText}`;
  }

  /**
   * Format overall summary
   */
  private formatOverallSummary(summary: ConflictSummary): string {
    if (summary.totalConflicts === 0) {
      return this.colorize(
        "✅ No conflicts detected. Metadata appears consistent across all sources.",
        "green",
      );
    }

    const total = summary.totalConflicts;
    const critical = summary.bySeverity.critical.length;
    const autoResolvable = summary.autoResolvableConflicts.length;
    const scoreText = `Overall conflict score: ${(summary.overallScore * 100).toFixed(0)}%`;

    let text = `Found ${total} conflict${total === 1 ? "" : "s"} in metadata reconciliation. `;

    if (critical > 0) {
      text += this.colorize(
        `${critical} critical issue${critical === 1 ? "" : "s"} require immediate attention. `,
        "red",
      );
    }

    if (autoResolvable > 0) {
      text += this.colorize(
        `${autoResolvable} conflict${autoResolvable === 1 ? "" : "s"} can be automatically resolved. `,
        "green",
      );
    }

    text += scoreText;

    return text;
  }

  /**
   * Format severity breakdown
   */
  private formatSeverityBreakdown(
    bySeverity: Record<ConflictSeverity, DetailedConflict[]>,
  ): string {
    const lines: string[] = [];

    Object.entries(bySeverity).forEach(([severity, conflicts]) => {
      if (conflicts.length > 0) {
        const indicator = this.severityIndicators[severity as ConflictSeverity];
        const color = this.getSeverityColor(severity as ConflictSeverity);
        const text = `${indicator} ${severity.toUpperCase()}: ${conflicts.length}`;
        lines.push(this.colorize(text, color));
      }
    });

    return lines.join("\n");
  }

  /**
   * Format type breakdown
   */
  private formatTypeBreakdown(byType: Record<ConflictType, DetailedConflict[]>): string {
    const lines: string[] = [];

    Object.entries(byType).forEach(([type, conflicts]) => {
      if (conflicts.length > 0) {
        const indicator = this.typeIndicators[type as ConflictType];
        const displayType = type.replace(/_/g, " ");
        lines.push(`${indicator} ${displayType}: ${conflicts.length}`);
      }
    });

    return lines.join("\n");
  }

  /**
   * Format field breakdown
   */
  private formatFieldBreakdown(byField: Record<string, DetailedConflict[]>): string {
    const lines: string[] = [];

    // Sort fields by number of conflicts (descending)
    const sortedFields = Object.entries(byField)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 10); // Show top 10 most problematic fields

    sortedFields.forEach(([field, conflicts]) => {
      const displayField = field.replace(/([A-Z])/g, " $1").toLowerCase();
      const criticalCount = conflicts.filter((c) => c.severity === "critical").length;
      const criticalText =
        criticalCount > 0 ? this.colorize(` (${criticalCount} critical)`, "red") : "";
      lines.push(`📝 ${displayField}: ${conflicts.length}${criticalText}`);
    });

    return lines.join("\n");
  }

  /**
   * Format detailed conflict information
   */
  private formatDetailedConflict(conflict: DetailedConflict): string[] {
    const lines: string[] = [];
    const formatted = this.formatConflict(conflict);

    // Header
    lines.push(this.colorize(`${formatted.severityIndicator} ${formatted.title}`, "bright"));

    // Type and auto-resolve status
    const autoStatus = conflict.autoResolvable
      ? this.colorize("✅ Auto-resolvable", "green")
      : this.colorize("⚠️  Manual review", "yellow");
    lines.push(`${formatted.typeIndicator} | ${autoStatus}`);

    // Description
    if (this.config.showDetailedExplanations) {
      lines.push("");
      lines.push(this.wrapText(formatted.description));
    }

    // Values
    lines.push("");
    lines.push(this.colorize("Conflicting Values:", "bright"));
    formatted.formattedValues.forEach((valueDisplay) => {
      const sourceLine = this.config.showSourceInfo
        ? ` (${valueDisplay.source.name} ${valueDisplay.source.reliabilityIndicator})`
        : "";
      lines.push(`  • ${valueDisplay.value}${sourceLine}`);
    });

    // Resolution
    lines.push("");
    lines.push(this.colorize("Resolution:", "bright"));
    lines.push(this.wrapText(formatted.resolutionExplanation, 2));

    // Impact
    lines.push("");
    lines.push(this.colorize("Impact:", "bright"));
    lines.push(this.wrapText(formatted.impactSummary, 2));

    // Suggestions
    if (formatted.suggestions.length > 0 && this.config.showResolutionSuggestions) {
      lines.push("");
      lines.push(this.colorize("Suggestions:", "bright"));
      formatted.suggestions.forEach((suggestion) => {
        lines.push(this.wrapText(suggestion, 2));
      });
    }

    return lines;
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: ConflictSeverity): keyof typeof this.colors {
    switch (severity) {
      case "critical":
        return "red";
      case "major":
        return "yellow";
      case "minor":
        return "blue";
      case "informational":
        return "gray";
      default:
        return "white";
    }
  }

  /**
   * Apply color to text if colors are enabled
   */
  private colorize(text: string, color: keyof typeof this.colors): string {
    if (!this.config.useColors) {
      return text;
    }
    return `${this.colors[color]}${text}${this.colors.reset}`;
  }

  /**
   * Wrap text to specified width
   */
  private wrapText(text: string, indent: number = 0): string {
    const maxWidth = this.config.maxWidth - indent;
    const indentStr = " ".repeat(indent);

    if (text.length <= maxWidth) {
      return indentStr + text;
    }

    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? " " : "") + word;
      } else {
        if (currentLine) {
          lines.push(indentStr + currentLine);
          currentLine = word;
        } else {
          // Word is longer than max width, break it
          lines.push(indentStr + word);
        }
      }
    }

    if (currentLine) {
      lines.push(indentStr + currentLine);
    }

    return lines.join("\n");
  }
}
