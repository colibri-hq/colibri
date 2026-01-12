/**
 * Glossary entry definition
 */
export interface GlossaryEntry {
  /** The canonical term identifier (lowercase, no spaces) */
  id: string;
  /** Display name for the term */
  displayTerm: string;
  /** Short definition (1-2 sentences) */
  definition: string;
  /** Optional URL to learn more */
  learnMoreUrl?: string;
  /** Alternative spellings or synonyms */
  aliases?: string[];
}

/**
 * Central glossary data
 *
 * This should be expanded over time as documentation grows.
 * Consider moving to a JSON file or CMS for easier non-technical editing.
 */
export const GLOSSARY: GlossaryEntry[] = [
  // Ebook Concepts
  {
    id: "epub",
    displayTerm: "EPUB",
    definition:
      "Electronic Publication - a reflowable ebook format that adapts to different screen sizes. The most common open ebook standard.",
    learnMoreUrl: "/user-guide/uploading-books#supported-formats",
  },
  {
    id: "mobi",
    displayTerm: "MOBI",
    definition:
      "Mobipocket format - an older ebook format primarily used by Amazon Kindle devices (now largely replaced by AZW/KFX).",
    learnMoreUrl: "/user-guide/uploading-books#supported-formats",
  },
  {
    id: "pdf",
    displayTerm: "PDF",
    definition:
      "Portable Document Format - a fixed-layout document format that preserves exact formatting across all devices. Colibri supports PDFs as ebook assets.",
    learnMoreUrl: "/user-guide/uploading-books#supported-formats",
  },
  {
    id: "isbn",
    displayTerm: "ISBN",
    definition:
      "International Standard Book Number - a unique numeric identifier for books. Used by Colibri to match books with metadata from external sources.",
    learnMoreUrl: "/user-guide/metadata-enrichment",
  },
  {
    id: "metadata",
    displayTerm: "Metadata",
    definition:
      "Information about a book beyond its content: title, author, publisher, publication date, ISBN, cover image, and more. Colibri enriches this automatically.",
    learnMoreUrl: "/user-guide/metadata-enrichment",
  },
  {
    id: "drm",
    displayTerm: "DRM",
    definition:
      "Digital Rights Management - copy protection on ebooks. Colibri cannot process DRM-protected files; you must use DRM-free ebooks.",
  },
  {
    id: "opds",
    displayTerm: "OPDS",
    definition:
      "Open Publication Distribution System - a standard for distributing ebook catalogs. Allows ereader apps to browse your Colibri library.",
    learnMoreUrl: "/user-guide/opds-feeds",
  },

  // Technical Concepts
  {
    id: "self-hosting",
    displayTerm: "Self-Hosting",
    definition:
      "Running software on your own server or computer instead of using a cloud service. Gives you complete control and privacy.",
    learnMoreUrl: "/getting-started/introduction",
  },
  {
    id: "instance",
    displayTerm: "Instance",
    definition:
      'Your installation of Colibri. Think of it as "your Colibri server" - each person runs their own instance.',
  },
  {
    id: "postgresql",
    displayTerm: "PostgreSQL",
    definition:
      "A powerful open-source database system. Colibri uses PostgreSQL to store library information, metadata, and user data.",
    learnMoreUrl: "/setup/installation",
    aliases: ["postgres"],
  },
  {
    id: "s3",
    displayTerm: "S3 Storage",
    definition:
      "Object storage for files (like Amazon S3). Colibri uses S3-compatible storage to save your ebook files, covers, and other assets.",
    learnMoreUrl: "/setup/storage",
    aliases: ["object-storage"],
  },
  {
    id: "docker",
    displayTerm: "Docker",
    definition:
      "A tool that packages software into containers - isolated environments that run consistently anywhere. Makes installing Colibri easier.",
    learnMoreUrl: "/setup/installation#docker",
  },
  {
    id: "environment-variables",
    displayTerm: "Environment Variables",
    definition:
      "Configuration settings stored outside your code. Used to customize Colibri without changing its source code.",
    learnMoreUrl: "/setup/configuration",
    aliases: ["env-vars"],
  },
  {
    id: "api",
    displayTerm: "API",
    definition:
      "Application Programming Interface - a way for programs to communicate. Colibri's API allows the CLI and web interface to interact with your library.",
    learnMoreUrl: "/user-guide/api",
  },
  {
    id: "cli",
    displayTerm: "CLI",
    definition:
      "Command Line Interface - a text-based way to control software. Colibri's CLI lets you manage your library from the terminal.",
    learnMoreUrl: "/user-guide/cli",
    aliases: ["command-line"],
  },

  // Colibri-Specific
  {
    id: "work",
    displayTerm: "Work",
    definition:
      'The abstract concept of a book in Colibri. For example, "The Great Gatsby" is a Work. It can have multiple Editions (1st edition, revised edition, etc.).',
    learnMoreUrl: "/user-guide/library-management",
  },
  {
    id: "edition",
    displayTerm: "Edition",
    definition:
      'A specific publication of a Work. For example, the 2004 Penguin Classics edition of "The Great Gatsby" is an Edition.',
    learnMoreUrl: "/user-guide/library-management",
  },
  {
    id: "asset",
    displayTerm: "Asset",
    definition:
      "An ebook file (EPUB, MOBI, or PDF) stored in Colibri. Each Edition can have multiple Assets (e.g., both EPUB and MOBI versions).",
  },
  {
    id: "confidence-score",
    displayTerm: "Confidence Score",
    definition:
      "A percentage indicating how certain Colibri is that metadata from an external source matches your book. Higher scores mean better matches.",
    learnMoreUrl: "/user-guide/metadata-enrichment#confidence-scores",
  },
  {
    id: "enrichment",
    displayTerm: "Metadata Enrichment",
    definition:
      "The process of automatically fetching and adding metadata (author, publisher, cover, etc.) from external sources like Open Library and WikiData.",
    learnMoreUrl: "/user-guide/metadata-enrichment",
    aliases: ["metadata-fetching"],
  },
  {
    id: "collection",
    displayTerm: "Collection",
    definition:
      'A custom grouping of books you create. Like a playlist for music, but for books. Examples: "To Read", "Favorites", "Science Fiction".',
    learnMoreUrl: "/user-guide/collections",
  },
  {
    id: "passkeys",
    displayTerm: "Passkeys",
    definition:
      "A modern, passwordless authentication method using biometrics or a security key. More secure and convenient than traditional passwords.",
    learnMoreUrl: "/user-guide/authentication",
  },
  {
    id: "webauthn",
    displayTerm: "WebAuthn",
    definition:
      "Web Authentication API - the web standard that powers Passkeys. Provides phishing-resistant authentication using public key cryptography.",
    learnMoreUrl: "/user-guide/authentication",
  },
];

/**
 * Lookup map for faster access
 */
const glossaryMap = new Map<string, GlossaryEntry>();

// Build the lookup map
for (const entry of GLOSSARY) {
  glossaryMap.set(entry.id.toLowerCase(), entry);

  // Add aliases to map
  if (entry.aliases) {
    for (const alias of entry.aliases) {
      glossaryMap.set(alias.toLowerCase(), entry);
    }
  }
}

/**
 * Get a glossary entry by term ID or alias
 */
export function getGlossaryEntry(term: string): GlossaryEntry | undefined {
  return glossaryMap.get(term.toLowerCase());
}

/**
 * Check if a term exists in the glossary
 */
export function hasGlossaryEntry(term: string): boolean {
  return glossaryMap.has(term.toLowerCase());
}

/**
 * Get all glossary entries, sorted alphabetically
 */
export function getAllGlossaryEntries(): GlossaryEntry[] {
  return [...GLOSSARY].sort((a, b) =>
    a.displayTerm.localeCompare(b.displayTerm),
  );
}

/**
 * Search glossary entries by query
 */
export function searchGlossary(query: string): GlossaryEntry[] {
  const trimmedQuery = query.trim();

  // Return empty array for empty queries
  if (trimmedQuery.length === 0) {
    return [];
  }

  const lowerQuery = trimmedQuery.toLowerCase();
  return GLOSSARY.filter(
    (entry) =>
      entry.displayTerm.toLowerCase().includes(lowerQuery) ||
      entry.definition.toLowerCase().includes(lowerQuery) ||
      entry.aliases?.some((alias) => alias.toLowerCase().includes(lowerQuery)),
  );
}
