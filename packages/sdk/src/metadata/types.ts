import type { LoosePartial } from "@colibri-hq/shared";

export interface BookMetadata {
  creators: CreatorMetadata[];
  dateCreated: Date;
  dateModified: Date;
  datePublished: Date;
  description: string;
  isbn: string;
  language: string;
  legalInformation: string;
  numberOfPages: number;
  openlibraryId: string;
  sortingKey: string;
  subjects: string[];
  title: string;
}

export interface PublisherMetadata {
  name: string;
  website: string;
  country: string;
  address: string;
  established: string;
}

export interface CreatorMetadata {
  amazonId: string;
  birthDate: Date;
  deathDate: Date;
  description: string;
  goodreadsId: string;
  location: string;
  name: string;
  openlibraryId: string;
  patreonId: string;
  sortingKey: string;
  url: string;
  wikipediaUrl: string;
}

export interface MetadataProvider {}

export interface BookMetadataProvider extends MetadataProvider {
  searchBook(properties: LoosePartial<BookMetadata>): Promise<LoosePartial<BookMetadata>[]>;
}

export interface PublisherMetadataProvider extends MetadataProvider {
  searchPublisher(
    name: string,
    properties: LoosePartial<Omit<PublisherMetadata, "name">>,
  ): Promise<LoosePartial<PublisherMetadata>[]>;
}

export interface CreatorMetadataProvider extends MetadataProvider {
  searchCreator(
    name: string,
    properties?: LoosePartial<Omit<CreatorMetadata, "name">>,
  ): Promise<LoosePartial<CreatorMetadata>[]>;
}
