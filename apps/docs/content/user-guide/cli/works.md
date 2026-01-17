---
title: Works Commands
description: CLI commands for managing works and editions
date: 2024-01-01
order: 2
tags: [cli, works, ebooks, reference]
relevance: 65
---

# Works Commands

Manage books (works) and their editions through the command line. These commands provide full control over your library from the terminal.

## Overview

Works represent the abstract concept of a book, while editions represent specific published versions. A single work can have multiple editions in different formats (EPUB, MOBI, PDF) or from different publishers.

---

## colibri works add

Add a new work from a local ebook file.

```bash
colibri works add <file> [options]
```

### Arguments

| Argument | Type | Description                                 |
| -------- | ---- | ------------------------------------------- |
| `file`   | path | Path to the ebook file (EPUB, MOBI, or PDF) |

### Options

| Option              | Short | Type    | Description                                    |
| ------------------- | ----- | ------- | ---------------------------------------------- |
| `--title`           | `-t`  | string  | Override the extracted title                   |
| `--author`          | `-a`  | string  | Override the extracted author                  |
| `--isbn`            | `-i`  | string  | Set ISBN for metadata lookup                   |
| `--publisher`       | `-p`  | string  | Override the publisher                         |
| `--language`        | `-l`  | string  | Set language (ISO 639-1 code)                  |
| `--enrich`          | `-e`  | boolean | Automatically enrich with external metadata    |
| `--collection`      | `-c`  | string  | Add to collection (by ID or name)              |
| `--series`          | `-s`  | string  | Add to series (format: "Series Name:Position") |
| `--tags`            |       | string  | Comma-separated tags                           |
| `--dry-run`         |       | boolean | Preview without importing                      |
| `--skip-duplicates` |       | boolean | Skip if duplicate detected                     |
| `--json`            |       | boolean | Output results as JSON                         |

### Examples

**Basic upload:**

```bash
colibri works add "The Great Gatsby.epub"
```

**Upload with metadata override:**

```bash
colibri works add book.epub \
  --title "The Correct Title" \
  --author "Author Name" \
  --isbn "9780743273565"
```

**Upload and auto-enrich:**

```bash
colibri works add book.epub --enrich
```

This will:

1. Extract metadata from the file
2. Search 14+ external providers for additional metadata
3. Merge and reconcile the results
4. Apply high-confidence metadata automatically

**Upload to a collection:**

```bash
colibri works add book.epub --collection "To Read"
```

**Upload to a series:**

```bash
colibri works add "book-01.epub" --series "My Series:1"
```

**Bulk import with wildcard:**

```bash
for file in *.epub; do
  colibri works add "$file" --enrich --skip-duplicates
done
```

**Preview without importing:**

```bash
colibri works add book.epub --dry-run --json
```

### Output

**Success:**

```
✓ Extracted metadata from The Great Gatsby.epub
✓ Found ISBN: 9780743273565
✓ Enriching metadata from 4 providers...
✓ Created work: The Great Gatsby (work_abc123)
✓ Created edition: First Scribner trade paperback edition (edition_def456)
✓ Uploaded asset: the-great-gatsby.epub (5.2 MB)

Confidence: 95% (Exceptional)
Sources: WikiData, Open Library, Library of Congress
```

**JSON Output:**

```json
{
  "status": "success",
  "work": {
    "id": "work_abc123",
    "title": "The Great Gatsby",
    "authors": ["F. Scott Fitzgerald"],
    "publicationDate": "1925-04-10"
  },
  "edition": { "id": "edition_def456", "format": "epub", "fileSize": 5242880 },
  "enrichment": { "confidence": 0.95, "sources": ["WikiData", "OpenLibrary", "LoC"] }
}
```

---

## colibri works list

List works in your library with filtering and sorting.

```bash
colibri works list [options]
```

### Options

| Option         | Short | Type    | Default | Description                           |
| -------------- | ----- | ------- | ------- | ------------------------------------- |
| `--limit`      | `-n`  | number  | 20      | Number of results to show             |
| `--offset`     |       | number  | 0       | Pagination offset                     |
| `--author`     | `-a`  | string  |         | Filter by author name                 |
| `--publisher`  | `-p`  | string  |         | Filter by publisher                   |
| `--collection` | `-c`  | string  |         | Filter by collection                  |
| `--series`     | `-s`  | string  |         | Filter by series                      |
| `--language`   | `-l`  | string  |         | Filter by language code               |
| `--year`       | `-y`  | number  |         | Filter by publication year            |
| `--tag`        | `-t`  | string  |         | Filter by tag                         |
| `--format`     | `-f`  | string  |         | Filter by format (epub, mobi, pdf)    |
| `--sort`       |       | string  | title   | Sort by: title, author, date, updated |
| `--order`      |       | string  | asc     | Sort order: asc or desc               |
| `--json`       |       | boolean | false   | Output as JSON                        |
| `--csv`        |       | boolean | false   | Output as CSV                         |

### Examples

**List first 20 works:**

```bash
colibri works list
```

**List works by a specific author:**

```bash
colibri works list --author "Jane Austen"
```

**List works in a collection:**

```bash
colibri works list --collection "Science Fiction"
```

**List works in a series:**

```bash
colibri works list --series "Harry Potter"
```

**List with multiple filters:**

```bash
colibri works list \
  --author "Tolkien" \
  --language "en" \
  --year 1954
```

**Export to JSON:**

```bash
colibri works list --limit 100 --json > library.json
```

**Export to CSV:**

```bash
colibri works list --csv > library.csv
```

**Sort by date added (newest first):**

```bash
colibri works list --sort date --order desc --limit 10
```

### Output

**Table format (default):**

```
ID          Title                    Author               Published  Format
work_123    The Great Gatsby         F. Scott Fitzgerald  1925       epub
work_456    To Kill a Mockingbird    Harper Lee           1960       epub, pdf
work_789    1984                     George Orwell        1949       mobi
...

Showing 20 of 1,234 works
```

**JSON format:**

```json
{
  "works": [
    {
      "id": "work_123",
      "title": "The Great Gatsby",
      "authors": ["F. Scott Fitzgerald"],
      "published": "1925-04-10",
      "formats": ["epub"],
      "series": null,
      "tags": ["fiction", "american literature", "classics"]
    },
    ...
  ],
  "total": 1234,
  "limit": 20,
  "offset": 0
}
```

---

## colibri works inspect

View detailed information about a specific work or ebook file.

```bash
colibri works inspect <identifier> [options]
```

### Arguments

| Argument     | Type   | Description                   |
| ------------ | ------ | ----------------------------- |
| `identifier` | string | Work ID or path to ebook file |

### Options

| Option            | Type    | Description              |
| ----------------- | ------- | ------------------------ |
| `--json`          | boolean | Output as JSON           |
| `--show-metadata` | boolean | Show all metadata fields |
| `--show-editions` | boolean | List all editions        |
| `--show-assets`   | boolean | List all file assets     |

### Examples

**Inspect a work by ID:**

```bash
colibri works inspect work_abc123
```

**Inspect an ebook file before importing:**

```bash
colibri works inspect "book.epub"
```

**Show all editions:**

```bash
colibri works inspect work_abc123 --show-editions
```

**Get full metadata as JSON:**

```bash
colibri works inspect work_abc123 --json --show-metadata > work.json
```

### Output

**Work inspection:**

```
Work: The Great Gatsby
ID: work_abc123

Authors:
  - F. Scott Fitzgerald (Author)

Publisher: Scribner
Published: April 10, 1925
Language: English (en)
Pages: 180

Synopsis:
  The Great Gatsby is a 1925 novel by American writer F. Scott Fitzgerald.
  Set in the Jazz Age on Long Island, the novel depicts narrator Nick
  Carraway's interactions with mysterious millionaire Jay Gatsby...

Identifiers:
  ISBN-13: 9780743273565
  ISBN-10: 0743273567
  LCCN: 25007822

Series: None

Tags: fiction, american literature, classics, jazz age, 1920s

Editions: 2
  - First Scribner trade paperback edition (epub, 5.2 MB)
  - Kindle edition (mobi, 4.8 MB)

Added: 2024-01-15 10:30:00
Updated: 2024-01-20 14:45:00
```

**File inspection:**

```
File: The Great Gatsby.epub
Format: EPUB 3.0
Size: 5.2 MB
Checksum: a1b2c3d4e5f6...

Extracted Metadata:
  Title: The Great Gatsby
  Subtitle: None
  Author: F. Scott Fitzgerald
  Publisher: Scribner
  Published: 2004-09-30 (reprint)
  Language: en
  ISBN: 9780743273565
  Pages: 180

Cover: Yes (embedded)
Table of Contents: Yes
Chapters: 9

DRM: None
Encryption: None
```

---

## colibri works import

Bulk import ebooks from a directory.

```bash
colibri works import <directory> [options]
```

### Arguments

| Argument    | Type | Description                      |
| ----------- | ---- | -------------------------------- |
| `directory` | path | Directory containing ebook files |

### Options

| Option              | Short | Type    | Default             | Description                               |
| ------------------- | ----- | ------- | ------------------- | ----------------------------------------- |
| `--recursive`       | `-r`  | boolean | false               | Include subdirectories                    |
| `--pattern`         | `-p`  | string  | `*.{epub,mobi,pdf}` | File pattern to match                     |
| `--enrich`          | `-e`  | boolean | false               | Enrich all imports with external metadata |
| `--collection`      | `-c`  | string  |                     | Add all to this collection                |
| `--dry-run`         |       | boolean | false               | Preview without importing                 |
| `--skip-duplicates` |       | boolean | true                | Skip files that already exist             |
| `--parallel`        |       | number  | 1                   | Number of parallel imports                |
| `--quiet`           | `-q`  | boolean | false               | Suppress progress output                  |
| `--json`            |       | boolean | false               | Output results as JSON                    |

### Examples

**Import all ebooks from a folder:**

```bash
colibri works import ./ebooks/
```

**Recursive import with enrichment:**

```bash
colibri works import ./library/ --recursive --enrich
```

**Import only EPUB files:**

```bash
colibri works import ./books/ --pattern "*.epub"
```

**Preview import (dry run):**

```bash
colibri works import ./books/ --dry-run
```

**Import with parallel processing:**

```bash
colibri works import ./library/ --recursive --parallel 4
```

**Import into a collection:**

```bash
colibri works import ./sci-fi/ --collection "Science Fiction"
```

**Import from Calibre library structure:**

```bash
colibri works import ~/Calibre\ Library/ --recursive --skip-duplicates
```

### Output

**Progress:**

```
Scanning directory: /Users/me/library
Found 150 ebook files

Importing (4 parallel workers):
[====================================] 100% (150/150)

✓ 145 imported successfully
✗ 3 failed (see errors below)
⊘ 2 skipped (duplicates)

Errors:
  - book-corrupt.epub: Invalid EPUB structure
  - book-drm.epub: DRM protected, cannot read
  - book-empty.mobi: File appears to be empty

Time: 12m 34s
```

**JSON Output:**

```json
{
  "summary": {
    "total": 150,
    "imported": 145,
    "failed": 3,
    "skipped": 2
  },
  "imported": [
    {
      "file": "The Great Gatsby.epub",
      "work": "work_abc123",
      "status": "success"
    },
    ...
  ],
  "errors": [
    {
      "file": "book-corrupt.epub",
      "error": "Invalid EPUB structure"
    },
    ...
  ]
}
```

---

## colibri works update

Update metadata for an existing work.

```bash
colibri works update <work-id> [options]
```

### Options

| Option        | Type    | Description                             |
| ------------- | ------- | --------------------------------------- |
| `--title`     | string  | Update title                            |
| `--author`    | string  | Update author (replaces all)            |
| `--publisher` | string  | Update publisher                        |
| `--published` | string  | Update publication date (YYYY-MM-DD)    |
| `--language`  | string  | Update language code                    |
| `--synopsis`  | string  | Update description                      |
| `--isbn`      | string  | Add/update ISBN                         |
| `--tags`      | string  | Update tags (comma-separated)           |
| `--series`    | string  | Update series (format: "Name:Position") |
| `--enrich`    | boolean | Re-fetch metadata from external sources |
| `--json`      | boolean | Output results as JSON                  |

### Examples

```bash
# Update title
colibri works update work_abc123 --title "New Title"

# Re-enrich metadata
colibri works update work_abc123 --enrich

# Update multiple fields
colibri works update work_abc123 \
  --title "The Great Gatsby" \
  --author "F. Scott Fitzgerald" \
  --published "1925-04-10"
```

---

## colibri works delete

Delete a work and all its editions.

```bash
colibri works delete <work-id> [options]
```

### Options

| Option         | Type    | Description                          |
| -------------- | ------- | ------------------------------------ |
| `--force`      | boolean | Skip confirmation                    |
| `--keep-files` | boolean | Delete metadata but keep ebook files |
| `--json`       | boolean | Output results as JSON               |

### Examples

```bash
# Delete with confirmation
colibri works delete work_abc123

# Force delete without confirmation
colibri works delete work_abc123 --force

# Delete metadata but keep files
colibri works delete work_abc123 --keep-files
```

---

## Environment Variables

Configure CLI behavior with environment variables:

| Variable                  | Description              | Default                 |
| ------------------------- | ------------------------ | ----------------------- |
| `COLIBRI_API_URL`         | Colibri instance URL     | `http://localhost:3000` |
| `COLIBRI_API_TOKEN`       | Authentication token     | (from login)            |
| `COLIBRI_IMPORT_PARALLEL` | Default parallel workers | `1`                     |
| `COLIBRI_ENRICH_DEFAULT`  | Auto-enrich by default   | `false`                 |

---

## Best Practices

### Bulk Imports

For large imports:

1. Start with a dry run to check for issues
2. Use parallel workers (`--parallel 4`) for speed
3. Enable `--skip-duplicates` to avoid re-importing
4. Import to a collection first, review, then move to main library
5. Run enrichment as a separate step if it's slow

### Metadata Quality

To maintain high-quality metadata:

1. Always use `--enrich` for books with ISBNs
2. Review auto-imported metadata before accepting
3. Manually fix titles in ALL CAPS or incorrect casing
4. Verify author names match existing creators
5. Add appropriate tags during import

### Performance

- Use `--parallel` for bulk imports (2-4 workers recommended)
- Avoid enriching large batches (API rate limits)
- Use `--json` for scripting and post-processing
- Cache frequently used queries

---

## Troubleshooting

### Import Fails with "Duplicate detected"

**Solution:**
Use `--skip-duplicates` or review and delete the existing work first.

### Enrichment Takes Too Long

**Solution:**
Enrich in smaller batches or as a background job:

```bash
colibri works list --format epub --limit 100 --json | \
  jq -r '.[].id' | \
  xargs -I{} colibri works update {} --enrich
```

### File Not Recognized

**Solution:**
Check file format is supported (EPUB, MOBI, PDF). Verify file isn't corrupted:

```bash
colibri works inspect file.epub
```

---

## Related Documentation

- [CLI Overview](/user-guide/cli) - Introduction to the CLI
- [Creators Commands](/user-guide/cli/creators) - Manage authors and contributors
- [Publishers Commands](/user-guide/cli/publishers) - Manage publishers
- [Storage Commands](/user-guide/cli/storage) - Manage file storage
