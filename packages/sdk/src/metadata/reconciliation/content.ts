import type {
  Conflict,
  ContentDescriptionInput,
  CoverImage,
  Description,
  MetadataSource,
  Rating,
  ReconciledContentDescription,
  ReconciledField,
  Review,
  TableOfContents,
  TableOfContentsEntry,
} from "./types.js";

/**
 * Reconciles content descriptions including summaries, table of contents,
 * reviews, ratings, and cover images from multiple sources
 */
export class ContentReconciler {
  // Quality indicators for descriptions
  private readonly qualityIndicators = {
    positive: [
      "publisher",
      "official",
      "author",
      "editorial",
      "book jacket",
      "back cover",
      "dust jacket",
      "synopsis",
      "summary",
    ],
    negative: [
      "user",
      "review",
      "comment",
      "opinion",
      "personal",
      "brief",
      "short",
      "incomplete",
      "partial",
    ],
  };

  // Common description prefixes to remove
  private readonly descriptionPrefixes = [
    "description:",
    "summary:",
    "synopsis:",
    "about:",
    "overview:",
    "book description:",
    "product description:",
    "editorial review:",
    "from the publisher:",
    "from the back cover:",
    "book summary:",
  ];

  // Image quality scoring factors
  private readonly imageQualityFactors = {
    minWidth: 200,
    minHeight: 300,
    preferredWidth: 400,
    preferredHeight: 600,
    maxWidth: 2000,
    maxHeight: 3000,
    preferredAspectRatio: 1.5, // height/width for typical book covers
    aspectRatioTolerance: 0.3,
  };

  /**
   * Normalize a description string or object into a standardized Description
   */
  normalizeDescription(input: string | Description): Description {
    if (typeof input === "object" && input !== null) {
      const cleanText = this.cleanDescriptionText(input.text);
      return {
        text: cleanText,
        type: input.type || this.detectDescriptionType(input.text, input.source),
        length: input.length || this.detectDescriptionLength(cleanText),
        quality: input.quality ?? this.calculateDescriptionQuality(cleanText, input.source),
        language: input.language,
        source: input.source,
        raw: input.raw || input.text,
      };
    }

    const cleanText = this.cleanDescriptionText(input);
    return {
      text: cleanText,
      type: this.detectDescriptionType(input), // Use original text for type detection
      length: this.detectDescriptionLength(cleanText),
      quality: this.calculateDescriptionQuality(cleanText),
      raw: input,
    };
  }

  /**
   * Normalize table of contents input
   */
  normalizeTableOfContents(input: string | TableOfContents): TableOfContents {
    if (typeof input === "object" && input !== null) {
      return {
        entries: input.entries.map((entry) => this.normalizeTableOfContentsEntry(entry)),
        format: input.format || this.detectTableOfContentsFormat(input.entries),
        pageNumbers: input.pageNumbers ?? this.hasPageNumbers(input.entries),
        raw: input.raw,
      };
    }

    // Parse string input
    const entries = this.parseTableOfContentsString(input);
    return {
      entries,
      format: this.detectTableOfContentsFormat(entries),
      pageNumbers: this.hasPageNumbers(entries),
      raw: input,
    };
  }

  /**
   * Normalize cover image input
   */
  normalizeCoverImage(input: string | CoverImage): CoverImage {
    if (typeof input === "object" && input !== null) {
      return {
        url: input.url,
        width: input.width,
        height: input.height,
        format: input.format || this.detectImageFormat(input.url),
        size: input.size,
        quality: input.quality || this.detectImageQuality(input),
        aspectRatio: input.aspectRatio || this.calculateAspectRatio(input.width, input.height),
        source: input.source,
        verified: input.verified ?? false,
      };
    }

    return {
      url: input,
      format: this.detectImageFormat(input),
      quality: "medium",
      verified: false,
    };
  }

  /**
   * Reconcile descriptions from multiple sources
   */
  reconcileDescriptions(inputs: ContentDescriptionInput[]): ReconciledField<Description> {
    const allDescriptions: { description: Description; source: MetadataSource }[] = [];

    // Collect and normalize all descriptions
    for (const input of inputs) {
      if (input.descriptions && input.descriptions.length > 0) {
        for (const desc of input.descriptions) {
          const normalized = this.normalizeDescription(desc);
          if (normalized.text && normalized.text.length > 10) {
            allDescriptions.push({ description: normalized, source: input.source });
          }
        }
      }
    }

    if (allDescriptions.length === 0) {
      return {
        value: { text: "", type: "description", length: "short", quality: 0.1 },
        confidence: 0.1,
        sources: inputs.map((input) => input.source),
        reasoning: "No valid descriptions found",
      };
    }

    // Sort by quality and source reliability
    const sortedDescriptions = allDescriptions.sort((a, b) => {
      // First by description quality
      const qualityDiff = b.description.quality! - a.description.quality!;
      if (Math.abs(qualityDiff) > 0.1) return qualityDiff;

      // Then by source reliability
      const reliabilityDiff = b.source.reliability - a.source.reliability;
      if (Math.abs(reliabilityDiff) > 0.1) return reliabilityDiff;

      // Prefer longer descriptions if quality is similar
      return b.description.text.length - a.description.text.length;
    });

    const bestDescription = sortedDescriptions[0].description;
    const confidence = this.calculateDescriptionConfidence(
      bestDescription,
      sortedDescriptions[0].source,
    );

    // Check for conflicts
    const conflicts: Conflict[] = [];
    if (allDescriptions.length > 1) {
      const significantlyDifferent = allDescriptions.some(
        (item) => this.calculateTextSimilarity(item.description.text, bestDescription.text) < 0.7,
      );

      if (significantlyDifferent) {
        conflicts.push({
          field: "description",
          values: allDescriptions.map((item) => ({ value: item.description, source: item.source })),
          resolution:
            "Selected highest quality description based on content quality and source reliability",
        });
      }
    }

    return {
      value: bestDescription,
      confidence,
      sources: inputs.map((input) => input.source),
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      reasoning:
        conflicts.length > 0
          ? "Selected best description from multiple sources with conflict resolution"
          : "Selected best available description",
    };
  }

  /**
   * Reconcile table of contents from multiple sources
   */
  reconcileTableOfContents(inputs: ContentDescriptionInput[]): ReconciledField<TableOfContents> {
    const allTocs: { toc: TableOfContents; source: MetadataSource }[] = [];

    // Collect and normalize all table of contents
    for (const input of inputs) {
      if (input.tableOfContents) {
        const normalized = this.normalizeTableOfContents(input.tableOfContents);
        if (normalized.entries.length > 0) {
          allTocs.push({ toc: normalized, source: input.source });
        }
      }
    }

    if (allTocs.length === 0) {
      return {
        value: { entries: [], format: "simple", pageNumbers: false },
        confidence: 0.1,
        sources: inputs.map((input) => input.source),
        reasoning: "No table of contents found",
      };
    }

    // Sort by completeness and source reliability
    const sortedTocs = allTocs.sort((a, b) => {
      // First by number of entries
      const entriesDiff = b.toc.entries.length - a.toc.entries.length;
      if (entriesDiff !== 0) return entriesDiff;

      // Then by format quality (detailed > hierarchical > simple)
      const formatScore = (toc: TableOfContents) => {
        switch (toc.format) {
          case "detailed":
            return 3;
          case "hierarchical":
            return 2;
          case "simple":
            return 1;
          default:
            return 0;
        }
      };
      const formatDiff = formatScore(b.toc) - formatScore(a.toc);
      if (formatDiff !== 0) return formatDiff;

      // Finally by source reliability
      return b.source.reliability - a.source.reliability;
    });

    const bestToc = sortedTocs[0].toc;
    const confidence = sortedTocs[0].source.reliability * 0.9; // Slightly lower confidence for TOC

    return {
      value: bestToc,
      confidence,
      sources: inputs.map((input) => input.source),
      reasoning: "Selected most complete table of contents",
    };
  }

  /**
   * Reconcile reviews from multiple sources
   */
  reconcileReviews(inputs: ContentDescriptionInput[]): ReconciledField<Review[]> {
    const allReviews: Review[] = [];

    // Collect all reviews
    for (const input of inputs) {
      if (input.reviews && input.reviews.length > 0) {
        allReviews.push(...input.reviews);
      }
    }

    if (allReviews.length === 0) {
      return {
        value: [],
        confidence: 0.1,
        sources: inputs.map((input) => input.source),
        reasoning: "No reviews found",
      };
    }

    // Sort reviews by quality indicators
    const sortedReviews = allReviews.sort((a, b) => {
      // Prefer verified reviews
      if (a.verified !== b.verified) {
        return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
      }

      // Prefer reviews with helpfulness data
      const aHelpfulness = a.helpful && a.total ? a.helpful / a.total : 0;
      const bHelpfulness = b.helpful && b.total ? b.helpful / b.total : 0;
      if (Math.abs(aHelpfulness - bHelpfulness) > 0.1) {
        return bHelpfulness - aHelpfulness;
      }

      // Prefer longer reviews
      const aLength = a.text?.length || 0;
      const bLength = b.text?.length || 0;
      return bLength - aLength;
    });

    // Take top reviews (limit to prevent overwhelming data)
    const selectedReviews = sortedReviews.slice(0, 10);

    const avgSourceReliability =
      inputs.reduce((sum, input) => sum + input.source.reliability, 0) / inputs.length;
    const confidence = avgSourceReliability * 0.8; // Lower confidence for reviews

    return {
      value: selectedReviews,
      confidence,
      sources: inputs.map((input) => input.source),
      reasoning: `Selected top ${selectedReviews.length} reviews based on verification and quality`,
    };
  }

  /**
   * Reconcile ratings from multiple sources
   */
  reconcileRating(inputs: ContentDescriptionInput[]): ReconciledField<Rating> {
    const allRatings: { rating: Rating; source: MetadataSource }[] = [];

    // Collect all ratings
    for (const input of inputs) {
      if (input.ratings && input.ratings.length > 0) {
        for (const rating of input.ratings) {
          allRatings.push({ rating, source: input.source });
        }
      }
    }

    if (allRatings.length === 0) {
      return {
        value: { value: 0, scale: 5 },
        confidence: 0.1,
        sources: inputs.map((input) => input.source),
        reasoning: "No ratings found",
      };
    }

    // Calculate weighted average rating
    let totalWeightedRating = 0;
    let totalWeight = 0;

    for (const { rating, source } of allRatings) {
      // Normalize rating to 0-1 scale
      const normalizedRating = rating.value / rating.scale;

      // Weight by source reliability and rating count
      const countWeight = rating.count ? Math.log10(rating.count + 1) : 1;
      const weight = source.reliability * countWeight;

      totalWeightedRating += normalizedRating * weight;
      totalWeight += weight;
    }

    const averageNormalizedRating = totalWeightedRating / totalWeight;

    // Use most common scale or default to 5
    const scaleFrequency = new Map<number, number>();
    for (const { rating } of allRatings) {
      scaleFrequency.set(rating.scale, (scaleFrequency.get(rating.scale) || 0) + 1);
    }
    const mostCommonScale =
      Array.from(scaleFrequency.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 5;

    // Convert back to target scale
    const finalRating = averageNormalizedRating * mostCommonScale;

    // Calculate total count
    const totalCount = allRatings.reduce((sum, { rating }) => sum + (rating.count || 0), 0);

    const avgSourceReliability =
      allRatings.reduce((sum, { source }) => sum + source.reliability, 0) / allRatings.length;
    const confidence = avgSourceReliability * 0.9;

    // Check for conflicts (significantly different ratings)
    const conflicts: Conflict[] = [];
    if (allRatings.length > 1) {
      const normalizedRatings = allRatings.map(({ rating }) => rating.value / rating.scale);
      const maxDiff = Math.max(...normalizedRatings) - Math.min(...normalizedRatings);

      if (maxDiff > 0.3) {
        // More than 30% difference on normalized scale
        conflicts.push({
          field: "rating",
          values: allRatings.map(({ rating, source }) => ({ value: rating, source })),
          resolution: "Calculated weighted average based on source reliability and rating counts",
        });
      }
    }

    return {
      value: {
        value: Math.round(finalRating * 10) / 10, // Round to 1 decimal place
        scale: mostCommonScale,
        count: totalCount > 0 ? totalCount : undefined,
      },
      confidence,
      sources: inputs.map((input) => input.source),
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      reasoning:
        conflicts.length > 0
          ? "Calculated weighted average rating with conflict resolution"
          : "Calculated weighted average rating from all sources",
    };
  }

  /**
   * Reconcile cover images from multiple sources
   */
  reconcileCoverImage(inputs: ContentDescriptionInput[]): ReconciledField<CoverImage> {
    const allImages: { image: CoverImage; source: MetadataSource }[] = [];

    // Collect and normalize all cover images
    for (const input of inputs) {
      if (input.coverImages && input.coverImages.length > 0) {
        for (const img of input.coverImages) {
          const normalized = this.normalizeCoverImage(img);
          allImages.push({ image: normalized, source: input.source });
        }
      }
    }

    if (allImages.length === 0) {
      return {
        value: { url: "", quality: "medium", verified: false },
        confidence: 0.1,
        sources: inputs.map((input) => input.source),
        reasoning: "No cover images found",
      };
    }

    // Sort by image quality score and source reliability
    const sortedImages = allImages.sort((a, b) => {
      const aScore = this.calculateImageQualityScore(a.image) * a.source.reliability;
      const bScore = this.calculateImageQualityScore(b.image) * b.source.reliability;
      return bScore - aScore;
    });

    const bestImage = sortedImages[0].image;
    const bestSource = sortedImages[0].source;

    const imageQualityScore = this.calculateImageQualityScore(bestImage);
    const confidence = bestSource.reliability * imageQualityScore;

    // Check for conflicts (different images from different sources)
    const conflicts: Conflict[] = [];
    if (allImages.length > 1) {
      const uniqueUrls = new Set(allImages.map((item) => item.image.url));
      if (uniqueUrls.size > 1) {
        conflicts.push({
          field: "coverImage",
          values: allImages.map(({ image, source }) => ({ value: image, source })),
          resolution:
            "Selected highest quality image based on resolution, format, and source reliability",
        });
      }
    }

    return {
      value: bestImage,
      confidence,
      sources: inputs.map((input) => input.source),
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      reasoning:
        conflicts.length > 0
          ? "Selected best cover image from multiple sources with conflict resolution"
          : "Selected best available cover image",
    };
  }

  /**
   * Reconcile excerpt from multiple sources
   */
  reconcileExcerpt(inputs: ContentDescriptionInput[]): ReconciledField<string> {
    const allExcerpts: { excerpt: string; source: MetadataSource }[] = [];

    // Collect all excerpts
    for (const input of inputs) {
      if (input.excerpt && input.excerpt.trim().length > 0) {
        allExcerpts.push({ excerpt: input.excerpt.trim(), source: input.source });
      }
    }

    if (allExcerpts.length === 0) {
      return {
        value: "",
        confidence: 0.1,
        sources: inputs.map((input) => input.source),
        reasoning: "No excerpts found",
      };
    }

    // Sort by source reliability and excerpt length
    const sortedExcerpts = allExcerpts.sort((a, b) => {
      // First by source reliability
      const reliabilityDiff = b.source.reliability - a.source.reliability;
      if (Math.abs(reliabilityDiff) > 0.1) return reliabilityDiff;

      // Then by length (prefer moderate length)
      const aLength = a.excerpt.length;
      const bLength = b.excerpt.length;
      const idealLength = 500;
      const aDiff = Math.abs(aLength - idealLength);
      const bDiff = Math.abs(bLength - idealLength);
      return aDiff - bDiff;
    });

    const bestExcerpt = sortedExcerpts[0].excerpt;
    const confidence = sortedExcerpts[0].source.reliability * 0.8;

    return {
      value: bestExcerpt,
      confidence,
      sources: inputs.map((input) => input.source),
      reasoning: "Selected best excerpt based on source reliability and content quality",
    };
  }

  /**
   * Reconcile all content description fields
   */
  reconcileContentDescription(inputs: ContentDescriptionInput[]): ReconciledContentDescription {
    if (inputs.length === 0) {
      throw new Error("No content descriptions to reconcile");
    }

    return {
      description: this.reconcileDescriptions(inputs),
      tableOfContents: this.reconcileTableOfContents(inputs),
      reviews: this.reconcileReviews(inputs),
      rating: this.reconcileRating(inputs),
      coverImage: this.reconcileCoverImage(inputs),
      excerpt: this.reconcileExcerpt(inputs),
    };
  }

  /**
   * Clean and normalize description text
   */
  private cleanDescriptionText(text: string): string {
    if (!text || typeof text !== "string") {
      return "";
    }

    let cleaned = text.trim();

    // Remove common prefixes
    for (const prefix of this.descriptionPrefixes) {
      const regex = new RegExp(`^${prefix}\\s*`, "i");
      cleaned = cleaned.replace(regex, "");
    }

    // Normalize whitespace and line breaks
    cleaned = cleaned
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim();

    // Remove HTML tags if present
    cleaned = cleaned.replace(/<[^>]*>/g, "");

    // Decode common HTML entities
    cleaned = cleaned
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");

    return cleaned;
  }

  /**
   * Detect the type of description based on content and source
   */
  private detectDescriptionType(text: string, source?: string): Description["type"] {
    const lowerText = text.toLowerCase();
    const lowerSource = source?.toLowerCase() || "";

    // Check source indicators first
    if (lowerSource.includes("publisher") || lowerSource.includes("official")) {
      return "summary";
    }
    if (lowerSource.includes("review") || lowerSource.includes("editorial")) {
      return "blurb";
    }
    if (lowerSource.includes("abstract") || lowerSource.includes("academic")) {
      return "abstract";
    }

    // Check content indicators - look for prefixes first
    if (lowerText.startsWith("synopsis:") || lowerText.startsWith("synopsis ")) {
      return "synopsis";
    }
    if (lowerText.startsWith("summary:") || lowerText.startsWith("summary ")) {
      return "summary";
    }
    if (lowerText.startsWith("abstract:") || lowerText.startsWith("abstract ")) {
      return "abstract";
    }

    // Then check for content within text
    if (lowerText.includes("synopsis")) {
      return "synopsis";
    }
    if (lowerText.includes("summary")) {
      return "summary";
    }
    if (lowerText.includes("abstract")) {
      return "abstract";
    }

    // Default based on length and style
    if (text.length < 200) {
      return "blurb";
    } else if (text.length > 1000) {
      return "description";
    }

    return "summary";
  }

  /**
   * Detect description length category
   */
  private detectDescriptionLength(text: string): Description["length"] {
    const length = text.length;
    if (length < 200) return "short";
    if (length < 800) return "medium";
    return "long";
  }

  /**
   * Calculate quality score for a description
   */
  private calculateDescriptionQuality(text: string, source?: string): number {
    if (!text || text.length < 10) return 0.1;

    let quality = 0.5; // Base quality

    // Length factor (sweet spot around 200-600 characters)
    const length = text.length;
    if (length >= 100 && length <= 1000) {
      quality += 0.2;
    } else if (length >= 50 && length <= 1500) {
      quality += 0.1;
    } else if (length < 50 || length > 2000) {
      quality -= 0.1;
    }

    // Source quality indicators
    if (source) {
      const lowerSource = source.toLowerCase();
      for (const indicator of this.qualityIndicators.positive) {
        if (lowerSource.includes(indicator)) {
          quality += 0.1;
          break;
        }
      }
      for (const indicator of this.qualityIndicators.negative) {
        if (lowerSource.includes(indicator)) {
          quality -= 0.1;
          break;
        }
      }
    }

    // Content quality indicators
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length >= 2 && sentences.length <= 10) {
      quality += 0.1;
    }

    // Check for completeness (ends with proper punctuation)
    if (/[.!?]$/.test(text.trim())) {
      quality += 0.05;
    }

    // Check for promotional language (reduces quality)
    const promotionalWords = ["amazing", "incredible", "must-read", "bestseller", "award-winning"];
    const promotionalCount = promotionalWords.filter((word) =>
      text.toLowerCase().includes(word),
    ).length;
    if (promotionalCount > 2) {
      quality -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, quality));
  }

  /**
   * Normalize a table of contents entry
   */
  private normalizeTableOfContentsEntry(entry: TableOfContentsEntry): TableOfContentsEntry {
    return {
      title: entry.title.trim(),
      page: entry.page,
      level: entry.level || 0,
      children: entry.children?.map((child) => this.normalizeTableOfContentsEntry(child)),
    };
  }

  /**
   * Parse table of contents from string
   */
  private parseTableOfContentsString(input: string): TableOfContentsEntry[] {
    const entries: TableOfContentsEntry[] = [];
    const lines = input
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const line of lines) {
      // Try to extract page number
      const pageMatch =
        line.match(/^(.+?)\s+\.{2,}\s*(\d+)$/) ||
        line.match(/^(.+?)\s+(\d+)$/) ||
        line.match(/^(\d+)\.\s*(.+)$/);

      let title: string;
      let page: number | undefined;
      let level = 0;

      if (pageMatch) {
        if (pageMatch[1] && !isNaN(Number(pageMatch[2]))) {
          title = pageMatch[1].trim();
          page = Number(pageMatch[2]);
        } else if (pageMatch[2] && !isNaN(Number(pageMatch[1]))) {
          title = pageMatch[2].trim();
          page = Number(pageMatch[1]);
        } else {
          title = line;
        }
      } else {
        title = line;
      }

      // Detect indentation level
      const originalLine = input.split("\n").find((l) => l.trim() === line);
      if (originalLine) {
        const leadingSpaces = originalLine.length - originalLine.trimStart().length;
        level = Math.floor(leadingSpaces / 2);
      }

      // Clean title - remove chapter numbers and prefixes
      title = title.replace(/^(chapter\s*\d+:\s*|ch\s*\d+:\s*|\d+\.\s*)/i, "").trim();

      if (title.length > 0) {
        entries.push({ title, page, level });
      }
    }

    return entries;
  }

  /**
   * Detect table of contents format
   */
  private detectTableOfContentsFormat(entries: TableOfContentsEntry[]): TableOfContents["format"] {
    if (entries.some((entry) => entry.children && entry.children.length > 0)) {
      return "hierarchical";
    }
    if (entries.some((entry) => entry.page !== undefined)) {
      return "detailed";
    }
    return "simple";
  }

  /**
   * Check if table of contents has page numbers
   */
  private hasPageNumbers(entries: TableOfContentsEntry[]): boolean {
    return entries.some((entry) => entry.page !== undefined);
  }

  /**
   * Detect image format from URL
   */
  private detectImageFormat(url: string): CoverImage["format"] {
    const extension = url.toLowerCase().split(".").pop();
    switch (extension) {
      case "jpg":
      case "jpeg":
        return "jpeg";
      case "png":
        return "png";
      case "webp":
        return "webp";
      case "gif":
        return "gif";
      case "svg":
        return "svg";
      default:
        return "other";
    }
  }

  /**
   * Detect image quality category
   */
  private detectImageQuality(image: CoverImage): CoverImage["quality"] {
    if (!image.width || !image.height) return "medium";

    const area = image.width * image.height;

    if (area < 40000) return "thumbnail"; // < 200x200
    if (area < 160000) return "small"; // < 400x400
    if (area < 640000) return "medium"; // < 800x800
    if (area < 2560000) return "large"; // < 1600x1600
    return "original";
  }

  /**
   * Calculate aspect ratio
   */
  private calculateAspectRatio(width?: number, height?: number): number | undefined {
    if (!width || !height) return undefined;
    return height / width;
  }

  /**
   * Calculate image quality score
   */
  private calculateImageQualityScore(image: CoverImage): number {
    let score = 0.5; // Base score

    // Resolution scoring
    if (image.width && image.height) {
      const { minWidth, minHeight, preferredWidth, preferredHeight, maxWidth, maxHeight } =
        this.imageQualityFactors;

      // Width scoring
      if (image.width >= preferredWidth) {
        score += 0.2;
      } else if (image.width >= minWidth) {
        score += 0.1;
      } else {
        score -= 0.2;
      }

      // Height scoring
      if (image.height >= preferredHeight) {
        score += 0.2;
      } else if (image.height >= minHeight) {
        score += 0.1;
      } else {
        score -= 0.2;
      }

      // Penalize extremely large images
      if (image.width > maxWidth || image.height > maxHeight) {
        score -= 0.1;
      }

      // Aspect ratio scoring
      if (image.aspectRatio) {
        const { preferredAspectRatio, aspectRatioTolerance } = this.imageQualityFactors;
        const aspectRatioDiff = Math.abs(image.aspectRatio - preferredAspectRatio);
        if (aspectRatioDiff <= aspectRatioTolerance) {
          score += 0.1;
        } else if (aspectRatioDiff > aspectRatioTolerance * 2) {
          score -= 0.1;
        }
      }
    }

    // Format scoring
    switch (image.format) {
      case "jpeg":
      case "png":
        score += 0.1;
        break;
      case "webp":
        score += 0.05;
        break;
      case "gif":
        score -= 0.05;
        break;
    }

    // Source verification bonus
    if (image.verified) {
      score += 0.1;
    }

    // Quality category bonus
    switch (image.quality) {
      case "original":
        score += 0.15;
        break;
      case "large":
        score += 0.1;
        break;
      case "medium":
        score += 0.05;
        break;
      case "small":
        break;
      case "thumbnail":
        score -= 0.1;
        break;
    }

    return Math.max(0.1, Math.min(1.0, score));
  }

  /**
   * Calculate text similarity using simple word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(
      text1
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
    const words2 = new Set(
      text2
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );

    const intersection = new Set([...words1].filter((word) => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate confidence for description
   */
  private calculateDescriptionConfidence(description: Description, source: MetadataSource): number {
    let confidence = source.reliability;

    // Adjust based on description quality
    confidence *= 0.5 + description.quality! * 0.5;

    // Bonus for good length
    if (description.length === "medium") {
      confidence *= 1.1;
    } else if (description.length === "long") {
      confidence *= 1.05;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }
}
