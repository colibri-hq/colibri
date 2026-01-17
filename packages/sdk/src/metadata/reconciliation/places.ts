import type {
  Conflict,
  MetadataSource,
  PublicationInfoInput,
  PublicationPlace,
  ReconciledField,
} from "./types.js";

/**
 * Reconciles and standardizes publication places
 */
export class PlaceReconciler {
  private readonly cityAliases = new Map([
    // Major publishing centers with common variations
    ["new york", ["new york city", "nyc", "ny", "new york, ny", "manhattan", "brooklyn"]],
    ["london", ["london, england", "london, uk", "london, great britain"]],
    ["paris", ["paris, france", "paris, fr"]],
    ["berlin", ["berlin, germany", "berlin, de"]],
    ["tokyo", ["tokyo, japan", "tokyo, jp"]],
    ["toronto", ["toronto, canada", "toronto, on", "toronto, ontario"]],
    ["sydney", ["sydney, australia", "sydney, au"]],
    ["chicago", ["chicago, il", "chicago, illinois"]],
    ["boston", ["boston, ma", "boston, massachusetts"]],
    ["los angeles", ["la", "l.a.", "los angeles, ca", "los angeles, california"]],
    ["san francisco", ["sf", "s.f.", "san francisco, ca", "san francisco, california"]],
    ["philadelphia", ["philly", "philadelphia, pa", "philadelphia, pennsylvania"]],
    ["washington", ["washington, dc", "washington d.c.", "washington, d.c."]],
    [
      "cambridge",
      ["cambridge, ma", "cambridge, massachusetts", "cambridge, england", "cambridge, uk"],
    ],
    ["oxford", ["oxford, england", "oxford, uk"]],
    ["edinburgh", ["edinburgh, scotland", "edinburgh, uk"]],
    ["dublin", ["dublin, ireland", "dublin, ie"]],
    ["amsterdam", ["amsterdam, netherlands", "amsterdam, nl"]],
    ["munich", ["münchen", "munich, germany", "münchen, germany"]],
    ["vienna", ["wien", "vienna, austria", "wien, austria"]],
    ["zurich", ["zürich", "zurich, switzerland", "zürich, switzerland"]],
    ["stockholm", ["stockholm, sweden", "stockholm, se"]],
    ["copenhagen", ["copenhagen, denmark", "copenhagen, dk"]],
    ["helsinki", ["helsinki, finland", "helsinki, fi"]],
    ["oslo", ["oslo, norway", "oslo, no"]],
    ["madrid", ["madrid, spain", "madrid, es"]],
    ["barcelona", ["barcelona, spain", "barcelona, es"]],
    ["rome", ["roma", "rome, italy", "roma, italy"]],
    ["milan", ["milano", "milan, italy", "milano, italy"]],
    ["moscow", ["moscow, russia", "moscow, ru"]],
    ["st. petersburg", ["saint petersburg", "st petersburg", "st. petersburg, russia"]],
    ["beijing", ["peking", "beijing, china", "peking, china"]],
    ["shanghai", ["shanghai, china"]],
    ["hong kong", ["hong kong, china", "hk"]],
    ["singapore", ["singapore, sg"]],
    ["mumbai", ["bombay", "mumbai, india", "bombay, india"]],
    ["delhi", ["new delhi", "delhi, india", "new delhi, india"]],
    ["bangalore", ["bengaluru", "bangalore, india", "bengaluru, india"]],
    ["cairo", ["cairo, egypt"]],
    ["cape town", ["cape town, south africa"]],
    ["johannesburg", ["johannesburg, south africa"]],
    ["mexico city", ["mexico city, mexico", "ciudad de méxico"]],
    ["são paulo", ["sao paulo", "são paulo, brazil", "sao paulo, brazil"]],
    ["rio de janeiro", ["rio", "rio de janeiro, brazil"]],
    ["buenos aires", ["buenos aires, argentina"]],
    ["santiago", ["santiago, chile"]],
    ["lima", ["lima, peru"]],
    ["bogotá", ["bogota", "bogotá, colombia", "bogota, colombia"]],
  ]);

  private readonly countryAliases = new Map([
    [
      "united states",
      [
        "usa",
        "us",
        "america",
        "united states of america",
        "al",
        "ak",
        "az",
        "ar",
        "ca",
        "co",
        "ct",
        "de",
        "fl",
        "ga",
        "hi",
        "id",
        "il",
        "in",
        "ia",
        "ks",
        "ky",
        "la",
        "me",
        "md",
        "ma",
        "mi",
        "mn",
        "ms",
        "mo",
        "mt",
        "ne",
        "nv",
        "nh",
        "nj",
        "nm",
        "ny",
        "nc",
        "nd",
        "oh",
        "ok",
        "or",
        "pa",
        "ri",
        "sc",
        "sd",
        "tn",
        "tx",
        "ut",
        "vt",
        "va",
        "wa",
        "wv",
        "wi",
        "wy",
        "alabama",
        "alaska",
        "arizona",
        "arkansas",
        "california",
        "colorado",
        "connecticut",
        "delaware",
        "florida",
        "georgia",
        "hawaii",
        "idaho",
        "illinois",
        "indiana",
        "iowa",
        "kansas",
        "kentucky",
        "louisiana",
        "maine",
        "maryland",
        "massachusetts",
        "michigan",
        "minnesota",
        "mississippi",
        "missouri",
        "montana",
        "nebraska",
        "nevada",
        "new hampshire",
        "new jersey",
        "new mexico",
        "new york",
        "north carolina",
        "north dakota",
        "ohio",
        "oklahoma",
        "oregon",
        "pennsylvania",
        "rhode island",
        "south carolina",
        "south dakota",
        "tennessee",
        "texas",
        "utah",
        "vermont",
        "virginia",
        "washington",
        "west virginia",
        "wisconsin",
        "wyoming",
      ],
    ],
    ["united kingdom", ["uk", "great britain", "britain", "england", "scotland", "wales"]],
    ["germany", ["deutschland", "de"]],
    ["france", ["fr"]],
    ["italy", ["italia", "it"]],
    ["spain", ["españa", "es"]],
    ["netherlands", ["holland", "nl"]],
    ["switzerland", ["schweiz", "suisse", "ch"]],
    ["austria", ["österreich", "at"]],
    ["russia", ["russian federation", "ru"]],
    ["china", ["people's republic of china", "prc", "cn"]],
    ["japan", ["jp"]],
    ["south korea", ["korea", "republic of korea", "kr"]],
    ["australia", ["au"]],
    ["canada", ["ca"]],
    ["brazil", ["brasil", "br"]],
    ["mexico", ["méxico", "mx"]],
    ["india", ["in"]],
    ["south africa", ["za"]],
  ]);

  /**
   * Normalize a place string or object into a standardized PublicationPlace
   */
  normalizePlace(input: string | PublicationPlace): PublicationPlace {
    if (typeof input === "object" && input !== null) {
      return {
        name: input.name,
        normalized: input.normalized || this.normalizePlaceName(input.name),
        country: input.country || this.extractCountry(input.name),
        coordinates: input.coordinates,
      };
    }

    const normalized = this.normalizePlaceName(input);
    const country = this.extractCountry(input);

    return { name: input, normalized, country };
  }

  /**
   * Reconcile multiple publication places using standardization and conflict resolution
   */
  reconcilePlaces(inputs: PublicationInfoInput[]): ReconciledField<PublicationPlace> {
    if (inputs.length === 0) {
      throw new Error("No publication places to reconcile");
    }

    // Normalize all places
    const normalizedPlaces = inputs
      .filter((input) => {
        if (!input.place) return false;
        const placeStr = typeof input.place === "string" ? input.place : input.place.name;
        return placeStr && placeStr.trim() !== "";
      })
      .map((input) => ({ place: this.normalizePlace(input.place!), source: input.source }));

    if (normalizedPlaces.length === 0) {
      throw new Error("No valid publication places found");
    }

    if (normalizedPlaces.length === 1) {
      const place = normalizedPlaces[0];
      return {
        value: place.place,
        confidence: this.calculatePlaceConfidence(place.place, place.source),
        sources: [place.source],
        reasoning: "Single valid place",
      };
    }

    // Group by normalized name
    const placeGroups = new Map<string, typeof normalizedPlaces>();
    for (const item of normalizedPlaces) {
      const key = item.place.normalized || item.place.name.toLowerCase();
      if (!placeGroups.has(key)) {
        placeGroups.set(key, []);
      }
      placeGroups.get(key)!.push(item);
    }

    // Check for conflicts
    const conflicts: Conflict[] = [];
    if (placeGroups.size > 1) {
      conflicts.push({
        field: "publication_place",
        values: Array.from(placeGroups.values())
          .flat()
          .map((item) => ({ value: item.place, source: item.source })),
        resolution: "Selected place from most reliable source",
      });
    }

    // Select the best place (highest reliability)
    const allCandidates = Array.from(placeGroups.values()).flat();
    const bestCandidate = allCandidates.reduce((best, current) =>
      current.source.reliability > best.source.reliability ? current : best,
    );

    const confidence = this.calculatePlaceConfidence(bestCandidate.place, bestCandidate.source);

    return {
      value: bestCandidate.place,
      confidence,
      sources: [bestCandidate.source],
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      reasoning:
        conflicts.length > 0
          ? "Resolved conflict by selecting place from most reliable source"
          : "Selected place from most reliable source",
    };
  }

  /**
   * Normalize a place name string
   */
  private normalizePlaceName(name: string): string {
    if (!name) {
      return "";
    }

    let normalized = name.toLowerCase().trim();

    // Remove common prefixes and clean up
    normalized = normalized
      .replace(/^(the\s+)/i, "") // Remove "the"
      .replace(/[^\w\s,.-]/g, "") // Remove special characters except comma, period, hyphen
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    // Check for known city aliases
    for (const [canonical, aliases] of this.cityAliases.entries()) {
      if (
        aliases.some(
          (alias) =>
            normalized === alias ||
            normalized.startsWith(alias + ",") ||
            this.calculateSimilarity(normalized, alias) > 0.9,
        )
      ) {
        return canonical;
      }

      // Also check if the normalized name matches the canonical name
      if (normalized === canonical || normalized.startsWith(canonical + ",")) {
        return canonical;
      }
    }

    // If no exact match, try to clean up the format
    const parts = normalized.split(",").map((part) => part.trim());

    if (parts.length > 1) {
      // Try to match the first part (city) with known cities
      const [cityPart] = parts;

      for (const [canonical, aliases] of this.cityAliases.entries()) {
        if (aliases.includes(cityPart) || cityPart === canonical) {
          return canonical;
        }
      }
    }

    return normalized;
  }

  /**
   * Extract country from place name
   */
  private extractCountry(name: string): string | undefined {
    if (!name) {
      return undefined;
    }

    const normalized = name.toLowerCase().trim();
    const parts = normalized.split(",").map((part) => part.trim());

    // Check the last part first (most likely to be country)
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];

      // Check direct country matches
      for (const [canonical, aliases] of this.countryAliases.entries()) {
        if (part === canonical || aliases.includes(part)) {
          return canonical;
        }
      }
    }

    return undefined;
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
   * Calculate confidence score for a publication place
   */
  private calculatePlaceConfidence(place: PublicationPlace, source: MetadataSource): number {
    let confidence = source.reliability;

    // Adjust based on place name quality
    if (!place.name || place.name.trim().length === 0) {
      confidence *= 0.1;
    } else if (place.name.trim().length < 2) {
      confidence *= 0.3;
    }

    // Boost confidence for normalized places (known cities)
    if (place.normalized && place.normalized !== place.name.toLowerCase()) {
      confidence *= 1.2;
    }

    // Boost confidence if country is identified
    if (place.country) {
      confidence *= 1.1;
    }

    // Boost confidence for major publishing centers
    const majorCenters = [
      "new york",
      "london",
      "paris",
      "berlin",
      "tokyo",
      "toronto",
      "cambridge",
      "oxford",
    ];
    if (place.normalized && majorCenters.includes(place.normalized)) {
      confidence *= 1.3;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}
