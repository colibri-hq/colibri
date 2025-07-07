// region Search

export type BookSearchResult = {
  author_key: string[];
  author_name: string[];
  author_alternative_name: string[];
  contributor: string[];
  cover_edition_key: string;
  cover_i: number;
  ddc: string[];
  ebook_access: string;
  ebook_count_i: number;
  edition_count: number;
  edition_key: string[];
  first_publish_year: number;
  first_sentence: string[];
  format: string[];
  has_fulltext: boolean;
  ia: string[];
  ia_collection: string[];
  ia_collection_s: string;
  isbn: string[];
  key: string;
  language: string[];
  last_modified_i: number;
  lcc: string[];
  lccn: string[];
  lending_edition_s: string;
  lending_identifier_s: string;
  number_of_pages_median: number;
  oclc: string[];
  osp_count: number;
  printdisabled_s: string;
  public_scan_b: boolean;
  publish_date: string[];
  publish_place: string[];
  publish_year: number[];
  publisher: string[];
  seed: string[];
  title: string;
  title_suggest: string;
  title_sort: string;
  type: string;
  id_amazon: string[];
  id_better_world_books: string[];
  id_wikidata: string[];
  id_goodreads: string[];
  // noinspection JSNonASCIINames, NonAsciiCharacters
  id_depósito_legal: string[];
  id_google: string[];
  id_librarything: string[];
  id_bcid: string[];
  id_alibris_id: string[];
  id_abebooks: string[];
  id_bnc: string[];
  id_overdrive: string[];
  id_libris: string[];
  id_dnb: string[];
  subject: string[];
  place: string[];
  time: string[];
  person: string[];
  ia_loaded_id: string[];
  ia_box_id: string[];
  ratings_average: number;
  ratings_sortable: number;
  ratings_count: number;
  ratings_count_1: number;
  ratings_count_2: number;
  ratings_count_3: number;
  ratings_count_4: number;
  ratings_count_5: number;
  readinglog_count: number;
  want_to_read_count: number;
  currently_reading_count: number;
  already_read_count: number;
  publisher_facet: string[];
  person_key: string[];
  time_facet: string[];
  place_key: string[];
  person_facet: string[];
  subject_facet: string[];
  _version_: number;
  place_facet: string[];
  lcc_sort: string;
  author_facet: string[];
  subject_key: string[];
  ddc_sort: string;
  time_key: string[];

  id_bodleian_library: string[];
  id_british_library: string[];
  id_canadian_national_library_archive: string[];
  id_hathi_trust: string[];
  id_national_archives: string[];
  id_national_library: string[];
  id_nla: string[];
  id_paperback_swap: string[];
  id_readprint: string[];
};

export type SearchResultsResponsePayload<T> = {
  numFound: number;
  numFoundExact: boolean;
  start: number;
  docs: T[];
};

export type BookSearchResults =
  SearchResultsResponsePayload<BookSearchResult> & {
    offset: number | null;
    q: string;
  };

export type AuthorSearchResult = {
  _version_: number;
  already_read_count: number;
  currently_reading_count: number;
  key: AuthorId;
  name: string;
  ratings_average: number;
  ratings_count: number;
  ratings_count_1: number;
  ratings_count_2: number;
  ratings_count_3: number;
  ratings_count_4: number;
  ratings_count_5: number;
  ratings_sortable: number;
  readinglog_count: number;
  want_to_read_count: number;
  work_count: number;
  type: string;
  top_work: string;
  alternate_names?: string[];
  birth_date?: string;
  death_date?: string;
  top_subjects?: string[];
};

export type AuthorSearchResults =
  SearchResultsResponsePayload<AuthorSearchResult>;

// endregion

export type AuthorId = OpenLibraryIdentifier<"A">;
export type Author = {
  alternate_names: string[];
  bio: string | Text;
  birth_date: string;
  created: Timestamp;
  death_date: string;
  enumeration: string;
  eastern_order: boolean;
  entity_type: string;
  fuller_name: string;
  key: ResourceKey<"authors", AuthorId>;
  last_modified: Timestamp;
  latest_revision: number;
  links: Link[];
  location: string;
  name: string;
  personal_name: string;
  photos: number[];
  remote_ids: {
    /**
     * Amazon ID
     * Should be something like B000AQ0842
     *
     * @see https://www.amazon.com/-/e/@@@
     */
    amazon?: string;

    /**
     * BookBrainz
     * https://bookbrainz.org/author/@@@
     *
     * @see website: https://bookbrainz.org
     */
    bookbrainz?: string;

    /**
     * GoodReads
     * Should be a number
     *
     * @see https://www.goodreads.com/author/show/@@@
     */
    goodreads?: string;

    /**
     * ISNI
     *
     * @see https://isni.org/isni/@@@
     */
    isni?: string;

    /**
     * Integrated Authority File (GND)
     *
     * @see https://d-nb.info/gnd/@@@
     * @see https://gnd.network/
     */
    gnd?: string;

    /**
     * IMDb
     * Should be something like nm0393654
     *
     * @see https://www.imdb.com/name/@@@
     */
    imdb?: string;

    /**
     * Inventaire
     * two formats depending on if the author exists in wikidata, wd:Q42 or inv:914ad8068b8711ead0cc2efbed56e53c
     *
     * @see https://inventaire.io/entity/@@@
     */
    inventaire?: string;

    /**
     * Library of Congress Names
     * Should be something like nr92001540, no97027235, etc. (/^n[a-z]?[0-9]+$/)
     *
     * @see https://id.loc.gov/authorities/names/@@@
     * @see https://id.loc.gov/authorities/names.html
     */
    lc_naf?: string;

    /**
     * LibraryThing
     * Should be something like kingstephen-1
     *
     * @see https://www.librarything.com/author/@@@
     */
    librarything?: string;

    /**
     * LibriVox
     * Should be a number
     *
     * @see https://librivox.org/author/@@@
     */
    librivox?: string;

    /**
     * MusicBrainz
     * https://musicbrainz.org/artist/@@@
     *
     * @see website: https://musicbrainz.org
     */
    musicbrainz?: string;

    /**
     * Patreon
     * https://www.patreon.com/@@@
     *
     * @see website: https://www.patreon.com/
     */
    patreon?: string;

    /**
     * Project Gutenberg
     * Should be a number
     *
     * @see https://www.gutenberg.org/ebooks/author/@@@
     */
    project_gutenberg?: string;

    /**
     * Project Runeberg
     * Should be a string of alphanumeric characters (/[0-9a-z/.-]+/)
     *
     * @see https://runeberg.org/authors/@@@.html
     */
    project_runeberg?: string;

    /**
     * SBN/ICCU (National Library Service of Italy)
     * format is /^\D{2}[A-Z0-3]V\d{6}$/
     *
     * @see https://opac.sbn.it/risultati-autori/-/opac-autori/detail/@@@
     */
    opac_sbn?: string;

    /**
     * Storygraph
     * eg 50b7fbd9-84ac-450d-b2ed-78c861d4ef00
     *
     * @see https://app.thestorygraph.com/authors/@@@
     */
    storygraph?: string;

    /**
     * VIAF
     *
     * @see https://viaf.org/viaf/@@@
     */
    viaf?: string;

    /**
     * Wikidata
     *
     * @see https://www.wikidata.org/wiki/@@@
     */
    wikidata?: string;

    /**
     * YouTube
     * Link to the author's official YouTube channel
     *
     * @see https://www.youtube.com/@@@
     */
    youtube?: string;
  };
  revision: number;
  source_records: string[];
  title: string;
  type: ResourceTypeIdentifier<"authors">;
  wikipedia: string;
};

export type AuthorRole = {
  author: Partial<Author>;
  role: string;
  as: string;
};

export type WorkId = OpenLibraryIdentifier<"W">;
export type Work = {
  title: string;
  subtitle: string;
  authors: Partial<AuthorRole>[];
  translated_titles: TranslatedString[];
  subjects: string[];
  subject_places: string[];
  subject_times: string[];
  subject_people: string[];
  description: string | Text;
  dewey_number: string[];
  lc_classifications: string[];
  first_sentence: string | Text;
  original_languages: Partial<Language>[];
  other_titles: string[];
  first_publish_date: string;
  links: Link[];
  notes: string | Text;
  cover_edition: Partial<Edition>;
  covers: number[];
};

export type EditionId = `OL${number}M` | `OL${number}E`;
export type Edition = {
  accompanying_material: string;
  authors?:
    | Partial<Author>[]
    | ResourceIdentifier<"authors", AuthorId>[]
    | {
        author: ResourceIdentifier<"authors", AuthorId>;
        type: ResourceTypeIdentifier<`${string}_role`>;
      }[];
  by_statement: string;
  collections: Collection[];
  contributions: string[];
  copyright_date: string;
  covers?: number[];
  created: Timestamp;
  description: string | Text;
  dewey_decimal_class: string[];
  distributors: string[];
  edition_name: string;
  first_sentence: string | Text;
  full_title: string;
  genres: string[];
  identifiers: {
    amazon?: string[];
    goodreads?: string[];
    isbn?: string[];
    isbn_13?: string[];
    lccn?: string[];
    oclc?: string[];
    openlibrary?: string[];
    uri?: string[];
  };
  isbn_10: string[];
  isbn_13: string[];
  key: ResourceKey<"books", OpenLibraryIdentifier<"M">>;
  languages: ResourceIdentifier<"languages", string>[] | Partial<Language>[];
  last_modified: Timestamp;
  latest_revision: number;
  lc_classifications: string[];
  lccn: string[];
  links?: Link[];
  local_id?: string[];
  location: string[];
  notes: string | Text;
  number_of_pages: number;
  ocaid: string;
  oclc_numbers: string[];
  other_titles: string[];
  pagination: string;
  physical_dimensions: string;
  physical_format: string;
  publish_country: string;
  publish_date: string;
  publish_places: string[];
  publishers: string[];
  revision: number;
  scan_on_demand: boolean;
  scan_records: Partial<ScanRecord>[];
  series: string[];
  source_records: string[];
  subject_people?: string[];
  subject_places?: string[];
  subject_times?: string[];
  subjects: string[];
  subtitle: string;
  table_of_contents: Partial<TocItem>[];
  title: string;
  title_prefix: string;
  translated_from: Partial<Language>[];
  translation_of: string;
  type: ResourceTypeIdentifier<"edition">;
  uri_descriptions: string[];
  uris: string[];
  volumes: Partial<Volume>[];
  weight: string;
  work_titles: string[];
  works: Work[];
};

export type TocItem = {
  class: string;
  label: string;
  title: string;
  pagenum: string;
};

export type Collection = {
  name: string;
};

export type ScanRecord = {
  edition: Partial<Edition>;
  scan_status: string;
  locations: Partial<ScanLocation>[];
  source_record_id: string;
  shelves: string[];
  barcodes: string[];
  request_date: string;
  sponsor: Partial<User>;
  completion_date: string;
};

export type ScanLocation = {
  name: string;
};

export type User = {
  displayname: string;
  website: string[];
  description: string | Text;
  bot: boolean;
};

export type Language = {
  name: string;
  code: string;
  library_of_congress_name: string;
  translated_names: Partial<TranslatedString>[];
};

export type TranslatedString = {
  text: string;
  language: Partial<Language>;
};

export type Volume = {
  ia_id: string;
  volume_number: number;
};

export type Timestamp = {
  type: ResourceType<"datetime">;
  value: string;
};

export type Text = {
  type: ResourceType<"text">;
  value: string;
};

export type Link = {
  title: string;
  url: string;
  type: ResourceTypeIdentifier<"link">;
};

export type ResourceIdentifier<T extends string, U extends string> = {
  key: ResourceKey<T, U>;
};

export type ResourceTypeIdentifier<T extends string> = {
  key: ResourceType<T>;
};

export type ResourceKey<T extends string, U extends string> = `/${T}/${U}`;

export type OpenLibraryIdentifier<T extends string> = `OL${number}${T}`;

export type ResourceType<T extends string> = `/type/${T}`;
