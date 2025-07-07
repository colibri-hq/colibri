import type { Relator } from "./contributions.js";

export type Contributor = {
  name: string;
  roles: Relator[];
  sortingKey: string;
};

export type Identifier = {
  type:
    | "amazon"
    | "apple"
    | "asin"
    | "barnesandnoble"
    | "calibre"
    | "doi"
    | "douban"
    | "edelweiss"
    | "goodreads"
    | "google"
    | "isbn"
    | "kobo"
    | "mobi"
    | "orcid"
    | "overdrive"
    | "ozon"
    | "uri"
    | "uuid"
    | "worldcat"
    | "other";
  value: string;
};

export type Metadata = {
  contributors: Contributor[];
  title: string | undefined;

  cover?: Blob | undefined;
  dateCreated?: Date | undefined;
  dateModified?: Date | undefined;
  datePublished?: Date | undefined;
  identifiers?: Identifier[] | undefined;
  language?: string | undefined;
  legalInformation?: string | undefined;
  numberOfPages?: number | undefined;
  pageProgression?: "ltr" | "rtl" | undefined;
  properties?: {
    [key: string]: unknown;
  };
  sortingKey?: string | undefined;
  synopsis?: string | undefined;
  tags?: string[] | undefined;
};
