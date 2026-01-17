/**
 * Core types for metadata reconciliation
 */

export interface MetadataSource {
  name: string;
  reliability: number; // 0-1 scale
  timestamp: Date;
}

export interface ReconciledField<T> {
  value: T;
  confidence: number; // 0-1 scale
  sources: MetadataSource[];
  conflicts?: Conflict[] | undefined;
  reasoning?: string | undefined;
}

export interface Conflict {
  field: string;
  values: Array<{ value: unknown; source: MetadataSource }>;
  resolution: string;
}

// Publication-specific types
export interface PublicationDate {
  year?: number | undefined;
  month?: number | undefined;
  day?: number | undefined;
  raw?: string | undefined;
  precision: "year" | "month" | "day" | "unknown";
}

export interface Publisher {
  name: string;
  normalized?: string | undefined;
  location?: string | undefined;
}

export interface PublicationPlace {
  name: string;
  normalized?: string | undefined;
  country?: string | undefined;
  coordinates?: { lat: number; lng: number } | undefined;
}

export interface PublicationInfo {
  date?: PublicationDate | undefined;
  publisher?: Publisher | undefined;
  place?: PublicationPlace | undefined;
}

export interface PublicationInfoInput {
  date?: string | PublicationDate | undefined;
  publisher?: string | Publisher | undefined;
  place?: string | PublicationPlace | undefined;
  source: MetadataSource;
}

export interface ReconciledPublicationInfo {
  date: ReconciledField<PublicationDate>;
  publisher: ReconciledField<Publisher>;
  place: ReconciledField<PublicationPlace>;
}

// Subject and classification types
export interface Subject {
  name: string;
  normalized?: string | undefined;
  scheme?: "dewey" | "lcc" | "lcsh" | "bisac" | "custom" | "unknown" | undefined;
  code?: string | undefined;
  hierarchy?: string[] | undefined;
  type?: "subject" | "genre" | "keyword" | "tag" | undefined;
}

export interface SubjectInput {
  subjects?: (string | Subject)[] | undefined;
  source: MetadataSource;
}

export interface ReconciledSubjects {
  subjects: ReconciledField<Subject[]>;
}

// Identifier types
export interface Identifier {
  type: "isbn" | "oclc" | "lccn" | "doi" | "goodreads" | "amazon" | "google" | "other";
  value: string;
  normalized?: string | undefined;
  valid?: boolean | undefined;
}

export interface IdentifierInput {
  identifiers?: (string | Identifier)[] | undefined;
  isbn?: string | string[] | undefined;
  oclc?: string | string[] | undefined;
  lccn?: string | string[] | undefined;
  doi?: string | string[] | undefined;
  goodreads?: string | undefined;
  amazon?: string | undefined;
  google?: string | undefined;
  source: MetadataSource;
}

export interface ReconciledIdentifiers {
  identifiers: ReconciledField<Identifier[]>;
}

// Physical and format description types
export interface PhysicalDimensions {
  width?: number | undefined;
  height?: number | undefined;
  depth?: number | undefined;
  unit?: "mm" | "cm" | "in" | undefined;
  raw?: string | undefined;
}

export interface FormatInfo {
  binding?:
    | "hardcover"
    | "paperback"
    | "mass_market"
    | "board_book"
    | "spiral"
    | "leather"
    | "cloth"
    | "digital"
    | "audio"
    | "other"
    | undefined;
  format?:
    | "book"
    | "ebook"
    | "audiobook"
    | "magazine"
    | "journal"
    | "newspaper"
    | "other"
    | undefined;
  medium?: "print" | "digital" | "audio" | "braille" | "large_print" | "other" | undefined;
  raw?: string | undefined;
}

export interface LanguageInfo {
  code: string;
  name?: string | undefined;
  script?: string | undefined;
  region?: string | undefined;
  confidence?: number | undefined;
  raw?: string | undefined;
}

export interface PhysicalDescription {
  pageCount?: number | undefined;
  dimensions?: PhysicalDimensions | undefined;
  format?: FormatInfo | undefined;
  languages?: LanguageInfo[] | undefined;
  weight?: number; // in grams
  isbn?: string; // For format-specific ISBNs
  raw?: string | undefined;
}

export interface PhysicalDescriptionInput {
  pageCount?: number | string | undefined;
  dimensions?: string | PhysicalDimensions | undefined;
  format?: string | FormatInfo | undefined;
  binding?: string | undefined;
  languages?: string | string[] | LanguageInfo[] | undefined;
  weight?: number | string | undefined;
  isbn?: string | undefined;
  source: MetadataSource;
}

export interface ReconciledPhysicalDescription {
  pageCount: ReconciledField<number>;
  dimensions: ReconciledField<PhysicalDimensions>;
  format: ReconciledField<FormatInfo>;
  languages: ReconciledField<LanguageInfo[]>;
  weight: ReconciledField<number>;
}

// Content description types
export interface Description {
  text: string;
  type?: "summary" | "abstract" | "blurb" | "synopsis" | "description" | "other" | undefined;
  length?: "short" | "medium" | "long" | undefined;
  quality?: number | undefined; // 0-1 quality score
  language?: string | undefined; // ISO language code
  source?: string | undefined; // Original source of description
  raw?: string | undefined; // Original unprocessed text
}

export interface TableOfContents {
  entries: TableOfContentsEntry[];
  format?: "simple" | "detailed" | "hierarchical" | undefined;
  pageNumbers?: boolean | undefined;
  raw?: string | undefined;
}

export interface TableOfContentsEntry {
  title: string;
  page?: number | undefined;
  level?: number | undefined; // Hierarchy level (0 = top level)
  children?: TableOfContentsEntry[] | undefined;
}

export interface Review {
  text?: string | undefined;
  rating?: number | undefined; // 0-5 or 0-10 scale
  scale?: number | undefined; // Maximum rating value (5 or 10)
  reviewer?: string | undefined;
  source?: string | undefined;
  date?: Date | undefined;
  verified?: boolean | undefined; // Whether review is from verified purchase/reader
  helpful?: number | undefined; // Number of people who found review helpful
  total?: number | undefined; // Total number of people who rated helpfulness
}

export interface Rating {
  value: number;
  scale: number; // Maximum rating value
  count?: number | undefined; // Number of ratings
  distribution?: number[] | undefined; // Rating distribution (e.g., [5, 10, 20, 30, 35] for 1-5 stars)
  source?: string | undefined;
}

export interface CoverImage {
  url: string;
  width?: number | undefined;
  height?: number | undefined;
  format?: "jpeg" | "png" | "webp" | "gif" | "svg" | "other" | undefined;
  size?: number | undefined; // File size in bytes
  quality?: "thumbnail" | "small" | "medium" | "large" | "original" | undefined;
  aspectRatio?: number | undefined; // width/height
  source?: string | undefined;
  verified?: boolean | undefined; // Whether image is verified to be correct
}

export interface ContentDescription {
  descriptions?: Description[] | undefined;
  tableOfContents?: TableOfContents | undefined;
  reviews?: Review[] | undefined;
  ratings?: Rating[] | undefined;
  coverImages?: CoverImage[] | undefined;
  excerpt?: string | undefined; // Short excerpt or first few lines
  backCover?: string | undefined; // Back cover text
  flapCopy?: string | undefined; // Dust jacket flap copy
}

export interface ContentDescriptionInput {
  descriptions?: (string | Description)[] | undefined;
  tableOfContents?: string | TableOfContents | undefined;
  reviews?: Review[] | undefined;
  ratings?: Rating[] | undefined;
  coverImages?: (string | CoverImage)[] | undefined;
  excerpt?: string | undefined;
  backCover?: string | undefined;
  flapCopy?: string | undefined;
  source: MetadataSource;
}

export interface ReconciledContentDescription {
  description: ReconciledField<Description>;
  tableOfContents: ReconciledField<TableOfContents>;
  reviews: ReconciledField<Review[]>;
  rating: ReconciledField<Rating>;
  coverImage: ReconciledField<CoverImage>;
  excerpt: ReconciledField<string>;
}

// Series and relationship types
export interface Series {
  name: string;
  normalized?: string | undefined;
  volume?: number | string | undefined;
  position?: number | undefined; // Position in series (for non-numeric ordering)
  totalVolumes?: number | undefined;
  seriesType?:
    | "numbered"
    | "chronological"
    | "standalone"
    | "anthology"
    | "collection"
    | "unknown"
    | undefined;
  description?: string | undefined;
  identifiers?: Identifier[] | undefined;
  raw?: string | undefined; // Original series information
}

export interface Work {
  id?: string | undefined;
  title: string;
  normalized?: string | undefined;
  type?: "novel" | "short_story" | "novella" | "poem" | "essay" | "play" | "other" | undefined;
  originalLanguage?: string | undefined;
  firstPublished?: PublicationDate | undefined;
  authors?: string[] | undefined; // Author names or IDs
  identifiers?: Identifier[] | undefined;
}

export interface Edition {
  id?: string | undefined;
  workId?: string | undefined; // Reference to the Work this edition belongs to
  title?: string | undefined;
  format?: FormatInfo | undefined;
  language?: string | undefined;
  publicationDate?: PublicationDate | undefined;
  publisher?: Publisher | undefined;
  isbn?: string[] | undefined;
  pageCount?: number | undefined;
  identifiers?: Identifier[] | undefined;
}

export interface RelatedWork {
  workId?: string | undefined;
  title: string;
  relationshipType:
    | "sequel"
    | "prequel"
    | "companion"
    | "adaptation"
    | "translation"
    | "revision"
    | "anthology_contains"
    | "collection_contains"
    | "part_of"
    | "other";
  description?: string | undefined;
  confidence?: number | undefined; // 0-1 confidence in the relationship
  source?: string | undefined;
}

export interface Collection {
  name: string;
  normalized?: string | undefined;
  type: "anthology" | "collection" | "omnibus" | "series_collection" | "other";
  contents?: CollectionContent[] | undefined;
  editors?: string[] | undefined; // Editor names
  description?: string | undefined;
  totalWorks?: number | undefined;
}

export interface CollectionContent {
  title: string;
  type?: "novel" | "short_story" | "novella" | "poem" | "essay" | "excerpt" | "other" | undefined;
  authors?: string[] | undefined;
  pageRange?: { start?: number | undefined; end?: number | undefined } | undefined;
  position?: number | undefined; // Order within collection
  originalPublication?:
    | {
        title?: string | undefined; // Original publication title
        date?: PublicationDate | undefined;
        publisher?: string | undefined;
      }
    | undefined;
}

export interface SeriesInput {
  series?: (string | Series)[] | undefined;
  source: MetadataSource;
}

export interface WorkEditionInput {
  work?: Work | undefined;
  edition?: Edition | undefined;
  relatedWorks?: RelatedWork[] | undefined;
  source: MetadataSource;
}

export interface CollectionInput {
  collections?: (string | Collection)[] | undefined;
  isPartOfCollection?: boolean | undefined;
  collectionContents?: CollectionContent[] | undefined;
  source: MetadataSource;
}

export interface ReconciledSeries {
  series: ReconciledField<Series[]>;
}

export interface ReconciledWorkEdition {
  work: ReconciledField<Work>;
  edition: ReconciledField<Edition>;
  relatedWorks: ReconciledField<RelatedWork[]>;
}

export interface ReconciledCollection {
  collections: ReconciledField<Collection[]>;
  collectionContents: ReconciledField<CollectionContent[]>;
}

// Library preview types
export interface LibraryEntry {
  id: string;
  title: string;
  authors: string[];
  isbn?: string[] | undefined;
  publicationDate?: PublicationDate | undefined;
  publisher?: Publisher | undefined;
  series?: Series[] | undefined;
  work?: Work | undefined;
  edition?: Edition | undefined;
  identifiers?: Identifier[] | undefined;
  subjects?: Subject[] | undefined;
  description?: Description | undefined;
  language?: string | undefined;
  physicalDescription?: PhysicalDescription | undefined;
  coverImage?: CoverImage | undefined;
  addedDate: Date;
  lastModified: Date;
  tags?: string[] | undefined;
  collections?: string[] | undefined;
  rating?: number | undefined;
  readStatus?: "unread" | "reading" | "read" | "dnf";
  notes?: string | undefined;
}

export interface LibraryPreview {
  /** The proposed library entry */
  entry: LibraryEntry;
  /** Confidence in the proposed entry */
  confidence: number;
  /** Sources that contributed to this entry */
  sources: MetadataSource[];
  /** Duplicate detection results */
  duplicates: DuplicateMatch[];
  /** Edition selection information */
  editionSelection: EditionSelection;
  /** Series relationship information */
  seriesRelationships: SeriesRelationship[];
  /** Recommendations for the user */
  recommendations: LibraryRecommendation[];
  /** Quality assessment */
  quality: LibraryQuality;
}

export interface DuplicateMatch {
  /** Existing library entry that might be a duplicate */
  existingEntry: LibraryEntry;
  /** Similarity score (0-1) */
  similarity: number;
  /** Type of match */
  matchType: "exact" | "likely" | "possible" | "different_edition" | "related_work";
  /** Specific fields that matched */
  matchingFields: DuplicateMatchField[];
  /** Confidence in the duplicate detection */
  confidence: number;
  /** Recommended action */
  recommendation: "skip" | "merge" | "add_as_new" | "review_manually";
  /** Explanation of the match */
  explanation: string;
}

export interface DuplicateMatchField {
  /** Field name that matched */
  field: string;
  /** Similarity score for this field */
  similarity: number;
  /** Value from the new entry */
  newValue: unknown;
  /** Value from the existing entry */
  existingValue: unknown;
  /** Weight of this field in overall similarity */
  weight: number;
}

export interface EditionSelection {
  /** Selected edition */
  selectedEdition: Edition;
  /** All available editions found */
  availableEditions: Edition[];
  /** Reason for selection */
  selectionReason: string;
  /** Confidence in the selection */
  confidence: number;
  /** Alternative editions the user might prefer */
  alternatives: EditionAlternative[];
}

export interface EditionAlternative {
  /** Alternative edition */
  edition: Edition;
  /** Reason why this might be preferred */
  reason: string;
  /** Confidence score */
  confidence: number;
  /** Advantages over selected edition */
  advantages: string[];
}

export interface SeriesRelationship {
  /** Series this work belongs to */
  series: Series;
  /** Position in the series */
  position: number | string;
  /** Previous work in series */
  previousWork?: RelatedWork | undefined;
  /** Next work in series */
  nextWork?: RelatedWork | undefined;
  /** Other related works */
  relatedWorks: RelatedWork[];
  /** Confidence in the series relationship */
  confidence: number;
  /** Whether the series is complete in the library */
  isSeriesComplete: boolean;
  /** Missing works in the series */
  missingWorks: RelatedWork[];
}

export interface LibraryRecommendation {
  /** Type of recommendation */
  type:
    | "add_to_collection"
    | "update_existing"
    | "merge_duplicates"
    | "complete_series"
    | "improve_metadata"
    | "review_conflicts";
  /** Priority level */
  priority: "high" | "medium" | "low";
  /** Recommendation text */
  message: string;
  /** Detailed explanation */
  explanation: string;
  /** Actions the user can take */
  actions: RecommendationAction[];
}

export interface RecommendationAction {
  /** Action type */
  type: "add" | "update" | "merge" | "review" | "ignore";
  /** Action label */
  label: string;
  /** Action description */
  description: string;
  /** Whether this is the recommended action */
  isRecommended: boolean;
}

export interface LibraryQuality {
  /** Overall quality score */
  score: number;
  /** Quality level */
  level: "excellent" | "good" | "fair" | "poor";
  /** Completeness score */
  completeness: number;
  /** Accuracy score */
  accuracy: number;
  /** Consistency score */
  consistency: number;
  /** Areas of strength */
  strengths: string[];
  /** Areas needing improvement */
  improvements: string[];
}
