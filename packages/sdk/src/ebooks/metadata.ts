import type { Relator } from "./contributions.js";

export type Metadata = {
  title: string | undefined;
  contributors: {
    name: string;
    roles: Relator[];
    sortingKey: string;
  }[];
  language?: string | undefined;
  numberOfPages?: number | undefined;
  legalInformation?: string | undefined;
  cover?: Blob | undefined;

  [key: string]: unknown;
};
