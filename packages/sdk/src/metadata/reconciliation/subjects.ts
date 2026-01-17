import type { Conflict, MetadataSource, ReconciledField, Subject, SubjectInput } from "./types.js";

/**
 * Normalizes and reconciles subjects, genres, and classifications from multiple sources
 */
export class SubjectReconciler {
  // Dewey Decimal Classification mappings (simplified)
  private readonly deweyMappings = new Map([
    // Computer science, information, and general works
    ["000", ["computer science", "information", "general knowledge", "encyclopedias"]],
    ["004", ["computer science", "computing", "data processing"]],
    ["020", ["library science", "information science"]],

    // Philosophy and psychology
    ["100", ["philosophy", "psychology", "ethics"]],
    ["150", ["psychology", "mental health", "behavior"]],
    ["170", ["ethics", "moral philosophy"]],

    // Religion
    ["200", ["religion", "theology", "bible"]],
    ["220", ["bible", "biblical studies"]],
    ["280", ["christian denominations", "christianity"]],

    // Social sciences
    ["300", ["social sciences", "sociology", "anthropology"]],
    ["320", ["political science", "politics", "government"]],
    ["330", ["economics", "finance", "business"]],
    ["340", ["law", "legal studies"]],
    ["350", ["public administration", "government"]],
    ["360", ["social problems", "social services"]],
    ["370", ["education", "teaching", "learning"]],
    ["380", ["commerce", "trade", "transportation"]],
    ["390", ["customs", "folklore", "traditions"]],

    // Language
    ["400", ["language", "linguistics", "dictionaries"]],
    ["420", ["english language", "english"]],
    ["430", ["german language", "german"]],
    ["440", ["french language", "french"]],
    ["450", ["italian language", "italian"]],
    ["460", ["spanish language", "spanish"]],
    ["470", ["latin language", "latin"]],
    ["480", ["greek language", "greek"]],
    ["490", ["other languages"]],

    // Science and mathematics
    ["500", ["science", "mathematics", "natural sciences"]],
    ["510", ["mathematics", "math", "algebra", "geometry"]],
    ["520", ["astronomy", "space", "cosmology"]],
    ["530", ["physics", "mechanics", "thermodynamics"]],
    ["540", ["chemistry", "chemical sciences"]],
    ["550", ["earth sciences", "geology", "meteorology"]],
    ["560", ["paleontology", "fossils"]],
    ["570", ["biology", "life sciences", "botany", "zoology"]],
    ["580", ["botany", "plants"]],
    ["590", ["zoology", "animals"]],

    // Technology and applied sciences
    ["600", ["technology", "applied sciences", "medicine"]],
    ["610", ["medicine", "health", "medical sciences"]],
    ["620", ["engineering", "applied physics"]],
    ["630", ["agriculture", "farming"]],
    ["640", ["home economics", "family living"]],
    ["650", ["management", "business", "advertising"]],
    ["660", ["chemical engineering", "biotechnology"]],
    ["670", ["manufacturing", "industrial processes"]],
    ["680", ["manufacture for specific uses"]],
    ["690", ["construction", "building"]],

    // Arts and recreation
    ["700", ["arts", "fine arts", "recreation"]],
    ["710", ["landscape architecture", "area planning"]],
    ["720", ["architecture", "building design"]],
    ["730", ["sculpture", "plastic arts"]],
    ["740", ["drawing", "decorative arts"]],
    ["750", ["painting"]],
    ["760", ["graphic arts", "printmaking"]],
    ["770", ["photography", "computer art"]],
    ["780", ["music"]],
    ["790", ["recreation", "games", "sports"]],

    // Literature
    ["800", ["literature", "rhetoric", "literary criticism"]],
    ["810", ["american literature"]],
    ["820", ["english literature"]],
    ["830", ["german literature"]],
    ["840", ["french literature"]],
    ["850", ["italian literature"]],
    ["860", ["spanish literature"]],
    ["870", ["latin literature"]],
    ["880", ["greek literature"]],
    ["890", ["other literatures"]],

    // History and geography
    ["900", ["history", "geography", "biography"]],
    ["910", ["geography", "travel"]],
    ["920", ["biography", "genealogy"]],
    ["930", ["ancient history"]],
    ["940", ["european history"]],
    ["950", ["asian history"]],
    ["960", ["african history"]],
    ["970", ["north american history"]],
    ["980", ["south american history"]],
    ["990", ["other areas"]],
  ]);

  // Library of Congress Classification mappings (simplified)
  private readonly lccMappings = new Map([
    ["A", ["general works", "encyclopedias"]],
    ["B", ["philosophy", "psychology", "religion"]],
    ["C", ["auxiliary sciences of history"]],
    ["D", ["world history", "history of europe"]],
    ["E", ["history of america"]],
    ["F", ["history of america"]],
    ["G", ["geography", "anthropology", "recreation"]],
    ["H", ["social sciences"]],
    ["J", ["political science"]],
    ["K", ["law"]],
    ["L", ["education"]],
    ["M", ["music"]],
    ["N", ["fine arts"]],
    ["P", ["language", "literature"]],
    ["Q", ["science"]],
    ["R", ["medicine"]],
    ["S", ["agriculture"]],
    ["T", ["technology"]],
    ["U", ["military science"]],
    ["V", ["naval science"]],
    ["Z", ["bibliography", "library science"]],
  ]);

  // Common genre mappings
  private readonly genreMappings = new Map([
    // Fiction genres
    ["fiction", ["novel", "novels", "fiction", "literary fiction"]],
    ["mystery", ["mystery", "detective", "crime", "thriller", "suspense"]],
    ["romance", ["romance", "love story", "romantic fiction"]],
    ["science fiction", ["science fiction", "sci-fi", "sf", "speculative fiction"]],
    ["fantasy", ["fantasy", "epic fantasy", "urban fantasy", "magical realism"]],
    ["horror", ["horror", "supernatural", "gothic", "dark fantasy"]],
    ["historical fiction", ["historical fiction", "historical novel", "period fiction"]],
    ["young adult", ["young adult", "ya", "teen fiction", "juvenile fiction"]],
    ["children", ["children", "juvenile", "kids", "picture book"]],
    ["biography", ["biography", "autobiography", "memoir", "life story"]],
    ["history", ["history", "historical", "past events"]],
    ["science", ["science", "scientific", "research", "study"]],
    ["self-help", ["self-help", "self improvement", "personal development"]],
    ["business", ["business", "management", "entrepreneurship", "finance"]],
    ["health", ["health", "wellness", "medical", "fitness"]],
    ["cooking", ["cooking", "recipes", "culinary", "food"]],
    ["travel", ["travel", "guidebook", "tourism"]],
    ["adventure", ["adventure"]],
    ["art", ["art", "artistic", "visual arts", "design"]],
    ["music", ["music", "musical", "songs", "composition"]],
    ["sports", ["sports", "athletics", "games", "recreation"]],
    ["religion", ["religion", "spiritual", "faith", "theology"]],
    ["philosophy", ["philosophy", "philosophical", "ethics", "logic"]],
    ["poetry", ["poetry", "poems", "verse", "poetic"]],
    ["drama", ["drama", "plays", "theater", "theatrical"]],
    ["essay", ["essay", "essays", "commentary"]],
    ["nonfiction", ["nonfiction", "non-fiction"]],
    ["reference", ["reference", "dictionary", "encyclopedia", "handbook"]],
    ["textbook", ["textbook", "academic", "educational", "study guide"]],
  ]);

  // Subject normalization patterns
  private readonly subjectNormalizations = new Map([
    // Common variations and synonyms
    ["sci-fi", "science fiction"],
    ["sf", "science fiction"],
    ["ya", "young adult"],
    ["non-fiction", "nonfiction"],
    ["self-improvement", "self-help"],
    ["cook book", "cookbook"],
    ["cook books", "cookbooks"],
    ["guide book", "guidebook"],
    ["guide books", "guidebooks"],
    ["text book", "textbook"],
    ["text books", "textbooks"],
    ["how-to", "how to"],
    ["diy", "do it yourself"],
    ["wwii", "world war ii"],
    ["ww2", "world war ii"],
    ["wwi", "world war i"],
    ["ww1", "world war i"],
    ["usa", "united states"],
    ["uk", "united kingdom"],
    ["us history", "american history"],
    ["british history", "english history"],
    ["computer programming", "programming"],
    ["web development", "web design"],
    ["artificial intelligence", "ai"],
    ["machine learning", "ml"],
    ["data science", "data analysis"],
  ]);

  /**
   * Normalize a subject string or object into a standardized Subject
   */
  normalizeSubject(input: string | Subject): Subject {
    if (typeof input === "object" && input !== null) {
      return {
        name: input.name,
        normalized: input.normalized || this.normalizeSubjectName(input.name),
        scheme: input.scheme || this.detectScheme(input),
        code: input.code,
        hierarchy: input.hierarchy || this.buildHierarchy(input),
        type: input.type || this.detectType(input.name),
      };
    }

    const normalized = this.normalizeSubjectName(input);
    const scheme = this.detectSchemeFromString(input);
    const type = this.detectType(input);

    return {
      name: input,
      normalized,
      scheme,
      type,
      hierarchy: this.buildHierarchyFromString(input, scheme), // Use original input for hierarchy
    };
  }

  /**
   * Reconcile multiple subject lists using deduplication and merging
   */
  reconcileSubjects(inputs: SubjectInput[]): ReconciledField<Subject[]> {
    if (inputs.length === 0) {
      throw new Error("No subjects to reconcile");
    }

    // Flatten and normalize all subjects
    const allSubjects: { subject: Subject; source: MetadataSource }[] = [];

    for (const input of inputs) {
      if (!input.subjects || input.subjects.length === 0) continue;

      for (const subjectInput of input.subjects) {
        const normalized = this.normalizeSubject(subjectInput);
        // Only include subjects with meaningful names
        if (normalized.name && normalized.name.trim().length > 0) {
          allSubjects.push({ subject: normalized, source: input.source });
        }
      }
    }

    if (allSubjects.length === 0) {
      return {
        value: [],
        confidence: 0.1,
        sources: inputs.map((input) => input.source),
        reasoning: "No valid subjects found",
      };
    }

    // Deduplicate subjects
    const deduplicatedSubjects = this.deduplicateSubjects(allSubjects);

    // Sort by source reliability and subject quality
    const sortedSubjects = deduplicatedSubjects.sort((a, b) => {
      // First by source reliability
      const reliabilityDiff = b.source.reliability - a.source.reliability;
      if (reliabilityDiff !== 0) return reliabilityDiff;

      // Then by subject completeness (prefer subjects with codes, hierarchies, etc.)
      const aScore = this.calculateSubjectQuality(a.subject);
      const bScore = this.calculateSubjectQuality(b.subject);
      return bScore - aScore;
    });

    // Group subjects by type for better organization
    const subjectsByType = new Map<Subject["type"], Subject[]>();
    for (const item of sortedSubjects) {
      const type = item.subject.type || "subject";
      if (!subjectsByType.has(type)) {
        subjectsByType.set(type, []);
      }
      subjectsByType.get(type)!.push(item.subject);
    }

    // Combine all subjects, prioritizing by type (subjects > genres > keywords > tags)
    const typeOrder: Subject["type"][] = ["subject", "genre", "keyword", "tag"];
    const finalSubjects: Subject[] = [];

    for (const type of typeOrder) {
      if (subjectsByType.has(type)) {
        finalSubjects.push(...subjectsByType.get(type)!);
      }
    }

    // Calculate overall confidence
    const confidence = this.calculateSubjectsConfidence(
      finalSubjects,
      inputs.map((input) => input.source),
    );

    // Check for conflicts (different subjects from different sources)
    const conflicts: Conflict[] = [];
    if (inputs.length > 1) {
      const sourceSubjects = new Map<string, Subject[]>();
      for (const input of inputs) {
        if (input.subjects && input.subjects.length > 0) {
          sourceSubjects.set(
            input.source.name,
            input.subjects.map((s) => this.normalizeSubject(s)),
          );
        }
      }

      if (sourceSubjects.size > 1) {
        const allSourceSubjects = Array.from(sourceSubjects.values()).flat();
        const uniqueSubjects = new Set(allSourceSubjects.map((s) => s.normalized || s.name));

        if (uniqueSubjects.size !== allSourceSubjects.length) {
          conflicts.push({
            field: "subjects",
            values: Array.from(sourceSubjects.entries()).map(([sourceName, subjects]) => ({
              value: subjects,
              source: inputs.find((input) => input.source.name === sourceName)!.source,
            })),
            resolution:
              "Merged and deduplicated subjects from all sources, prioritizing by source reliability",
          });
        }
      }
    }

    return {
      value: finalSubjects,
      confidence,
      sources: inputs.map((input) => input.source),
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      reasoning:
        conflicts.length > 0
          ? "Merged and deduplicated subjects from multiple sources with conflict resolution"
          : "Merged and deduplicated subjects from all sources",
    };
  }

  /**
   * Normalize a subject name string
   */
  private normalizeSubjectName(name: string): string {
    if (!name || typeof name !== "string") {
      return "";
    }

    let normalized = name.toLowerCase().trim();

    // Remove common prefixes and suffixes
    normalized = normalized
      .replace(/^(the\s+|a\s+|an\s+)/i, "") // Remove articles
      .replace(/\s*--\s*/g, " - ") // Normalize separators
      .replace(/\s*;\s*/g, "; ") // Normalize semicolons
      .replace(/\s*,\s*/g, ", ") // Normalize commas
      .replace(/[^\w\s\-;,&\/\+]/g, " ") // Replace special characters with spaces except separators and common chars
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    // Apply known normalizations first
    if (this.subjectNormalizations.has(normalized)) {
      normalized = this.subjectNormalizations.get(normalized)!;
    }

    // Check for exact genre mappings first
    for (const [canonical, variations] of this.genreMappings.entries()) {
      if (variations.includes(normalized)) {
        return canonical;
      }
    }

    // Check for high similarity matches
    for (const [canonical, variations] of this.genreMappings.entries()) {
      if (variations.some((variation) => this.calculateSimilarity(normalized, variation) > 0.9)) {
        return canonical;
      }
    }

    return normalized;
  }

  /**
   * Detect the classification scheme from a Subject object
   */
  private detectScheme(subject: Subject): Subject["scheme"] {
    if (subject.scheme) return subject.scheme;
    if (subject.code) {
      return this.detectSchemeFromCode(subject.code);
    }
    return this.detectSchemeFromString(subject.name);
  }

  /**
   * Detect classification scheme from a string
   */
  private detectSchemeFromString(input: string): Subject["scheme"] {
    // Check for BISAC codes first (format like "FIC000000")
    if (/^[A-Z]{3}\d{6}/.test(input)) {
      return "bisac";
    }

    // Check for Dewey Decimal (3 digits)
    if (/^\d{3}(\.\d+)?/.test(input)) {
      return "dewey";
    }

    // Check for Library of Congress (letter followed by numbers)
    if (/^[A-Z]{1,3}\d+/.test(input)) {
      return "lcc";
    }

    // Check for LCSH (Library of Congress Subject Headings) patterns
    if (input.includes(" -- ") || input.includes(" - ")) {
      return "lcsh";
    }

    return "unknown";
  }

  /**
   * Detect classification scheme from a code
   */
  private detectSchemeFromCode(code: string): Subject["scheme"] {
    // Dewey Decimal Classification
    if (/^\d{3}(\.\d+)?$/.test(code)) {
      return "dewey";
    }

    // Library of Congress Classification
    if (/^[A-Z]{1,3}\d+/.test(code)) {
      return "lcc";
    }

    // BISAC codes
    if (/^[A-Z]{3}\d{6}$/.test(code)) {
      return "bisac";
    }

    return "unknown";
  }

  /**
   * Detect the type of subject (subject, genre, keyword, tag)
   */
  private detectType(name: string): Subject["type"] {
    const normalized = name.toLowerCase();

    // Check if it's a genre - exact matches only
    for (const [, variations] of this.genreMappings.entries()) {
      if (variations.includes(normalized)) {
        return "genre";
      }
    }

    // Check if it's a single word (likely a tag or keyword)
    if (normalized.split(/\s+/).length === 1 && normalized.length < 15) {
      return "tag";
    }

    // Check if it's a short phrase (likely a keyword)
    if (normalized.split(/\s+/).length <= 3 && normalized.length < 30) {
      return "keyword";
    }

    // Default to subject for longer, more descriptive terms
    return "subject";
  }

  /**
   * Build hierarchy for a Subject object
   */
  private buildHierarchy(subject: Subject): string[] {
    if (subject.hierarchy) return subject.hierarchy;
    if (subject.code && subject.scheme) {
      return this.buildHierarchyFromCode(subject.code, subject.scheme);
    }
    return this.buildHierarchyFromString(subject.normalized || subject.name, subject.scheme);
  }

  /**
   * Build hierarchy from a string and scheme
   */
  private buildHierarchyFromString(input: string, scheme?: Subject["scheme"]): string[] {
    const hierarchy: string[] = [];

    if (scheme === "lcsh" && (input.includes(" -- ") || input.includes(" - "))) {
      // LCSH uses " -- " or " - " to separate hierarchy levels
      // Keep original case for hierarchy parts
      const originalParts = input.split(/\s*-+\s*/).filter((part) => part.length > 0);
      return originalParts;
    }

    // For other schemes or unknown, try to build a simple hierarchy
    const normalized = this.normalizeSubjectName(input);
    hierarchy.push(normalized);

    // Add broader categories based on genre mappings
    for (const [canonical, variations] of this.genreMappings.entries()) {
      if (variations.includes(normalized) && canonical !== normalized) {
        hierarchy.unshift(canonical);
        break;
      }
    }

    return hierarchy;
  }

  /**
   * Build hierarchy from a classification code
   */
  private buildHierarchyFromCode(code: string, scheme: Subject["scheme"]): string[] {
    const hierarchy: string[] = [];

    if (scheme === "dewey") {
      const deweyCode = code.substring(0, 3);
      const broader = deweyCode.substring(0, 2) + "0";
      const broadest = deweyCode.substring(0, 1) + "00";

      if (this.deweyMappings.has(broadest)) {
        hierarchy.push(...this.deweyMappings.get(broadest)!);
      }
      if (broader !== broadest && this.deweyMappings.has(broader)) {
        hierarchy.push(...this.deweyMappings.get(broader)!);
      }
      if (deweyCode !== broader && this.deweyMappings.has(deweyCode)) {
        hierarchy.push(...this.deweyMappings.get(deweyCode)!);
      }
    } else if (scheme === "lcc") {
      const lccClass = code.substring(0, 1);
      if (this.lccMappings.has(lccClass)) {
        hierarchy.push(...this.lccMappings.get(lccClass)!);
      }
    }

    return hierarchy;
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
   * Deduplicate subjects based on normalized names and similarity
   */
  private deduplicateSubjects(
    subjects: { subject: Subject; source: MetadataSource }[],
  ): { subject: Subject; source: MetadataSource }[] {
    const deduplicated: { subject: Subject; source: MetadataSource }[] = [];
    const seen = new Set<string>();

    for (const item of subjects) {
      const key = item.subject.normalized || item.subject.name.toLowerCase();

      // Check if we've seen this exact normalized subject
      if (seen.has(key)) {
        continue;
      }

      // Check for similar subjects
      let isDuplicate = false;
      for (const existing of deduplicated) {
        const existingKey = existing.subject.normalized || existing.subject.name.toLowerCase();
        if (this.calculateSimilarity(key, existingKey) > 0.9) {
          // If current source is more reliable, replace the existing one
          if (item.source.reliability > existing.source.reliability) {
            const index = deduplicated.indexOf(existing);
            deduplicated[index] = item;
            seen.delete(existingKey);
            seen.add(key);
          }
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        deduplicated.push(item);
        seen.add(key);
      }
    }

    return deduplicated;
  }

  /**
   * Calculate quality score for a subject
   */
  private calculateSubjectQuality(subject: Subject): number {
    let score = 0;

    // Base score for having a name
    if (subject.name && subject.name.trim().length > 0) {
      score += 1;
    }

    // Bonus for normalization
    if (subject.normalized && subject.normalized !== subject.name.toLowerCase()) {
      score += 0.5;
    }

    // Bonus for having a classification scheme
    if (subject.scheme && subject.scheme !== "unknown") {
      score += 1;
    }

    // Bonus for having a code
    if (subject.code) {
      score += 0.5;
    }

    // Bonus for having hierarchy
    if (subject.hierarchy && subject.hierarchy.length > 1) {
      score += 0.5;
    }

    // Bonus for specific types
    switch (subject.type) {
      case "subject":
        score += 1;
        break;
      case "genre":
        score += 0.8;
        break;
      case "keyword":
        score += 0.6;
        break;
      case "tag":
        score += 0.4;
        break;
    }

    return score;
  }

  /**
   * Calculate confidence score for reconciled subjects
   */
  private calculateSubjectsConfidence(subjects: Subject[], sources: MetadataSource[]): number {
    if (subjects.length === 0) return 0.1;

    // Base confidence from source reliability
    const avgSourceReliability =
      sources.reduce((sum, source) => sum + source.reliability, 0) / sources.length;
    let confidence = avgSourceReliability;

    // Adjust based on number of subjects (more subjects generally means better coverage)
    if (subjects.length >= 5) {
      confidence *= 1.1;
    } else if (subjects.length >= 3) {
      confidence *= 1.05;
    } else if (subjects.length === 1) {
      confidence *= 0.9;
    }

    // Adjust based on subject quality
    const avgQuality =
      subjects.reduce((sum, subject) => sum + this.calculateSubjectQuality(subject), 0) /
      subjects.length;
    confidence *= 0.7 + avgQuality / 10; // Scale quality to 0.7-1.0 multiplier

    // Bonus for having subjects with classification schemes
    const classifiedSubjects = subjects.filter((s) => s.scheme && s.scheme !== "unknown").length;
    if (classifiedSubjects > 0) {
      confidence *= 1 + (classifiedSubjects / subjects.length) * 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}
