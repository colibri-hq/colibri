---
title: Publishers Commands
description: CLI commands for managing publishers
date: 2024-01-01
order: 5
tags: [cli, publishers, metadata, reference]
relevance: 60
---

# Publishers Commands

Manage publishers and publishing houses in your library.

## colibri publishers list

List all publishers in your library.

```bash
colibri publishers list [options]
```

### Options

| Option     | Description                     |
| ---------- | ------------------------------- |
| `--limit`  | Number of results (default: 20) |
| `--search` | Search by name                  |
| `--json`   | Output as JSON                  |

### Examples

```bash
# List all publishers
colibri publishers list

# Search for a specific publisher
colibri publishers list --search "Penguin"

# Export as JSON
colibri publishers list --json > publishers.json
```

## colibri publishers add

Add a new publisher manually.

```bash
colibri publishers add <name>
```

### Options

| Option          | Description             |
| --------------- | ----------------------- |
| `--location`    | Publisher location/city |
| `--founded`     | Year founded            |
| `--website`     | Publisher website URL   |
| `--description` | Publisher description   |

### Examples

```bash
# Basic addition
colibri publishers add "Penguin Random House"

# With full details
colibri publishers add "Tor Books" \
  --location "New York, NY" \
  --founded 1980 \
  --website "https://www.tor.com" \
  --description "Science fiction and fantasy publisher"
```

## colibri publishers inspect

View details about a specific publisher and their books.

```bash
colibri publishers inspect <publisher-id>
```

### Output

Displays:

- Publisher name and details
- Location and founding year
- Total books published
- List of works in your library

### Examples

```bash
# View by ID
colibri publishers inspect abc123

# With JSON output
colibri publishers inspect abc123 --json
```

## colibri publishers edit

Update publisher metadata.

```bash
colibri publishers edit <publisher-id> [options]
```

### Options

| Option          | Description           |
| --------------- | --------------------- |
| `--name`        | Update publisher name |
| `--location`    | Update location       |
| `--website`     | Update website URL    |
| `--description` | Update description    |

### Examples

```bash
# Update name
colibri publishers edit abc123 --name "Penguin Random House LLC"

# Update multiple fields
colibri publishers edit abc123 \
  --location "New York, NY" \
  --website "https://www.penguinrandomhouse.com"
```

## colibri publishers merge

Merge duplicate publishers.

```bash
colibri publishers merge <source-id> <target-id>
```

### Description

Merges all books from the source publisher into the target publisher, then deletes the source.

### Examples

```bash
# Merge "Penguin" into "Penguin Random House"
colibri publishers merge penguin-id random-house-id

# Preview merge without executing
colibri publishers merge penguin-id random-house-id --dry-run
```

## colibri publishers enrich

Fetch metadata for a publisher from external sources.

```bash
colibri publishers enrich <publisher-id>
```

### Sources

Fetches data from:

- Wikidata
- VIAF
- Open Library
- ISBNdb (if configured)

### Options

| Option       | Description                   |
| ------------ | ----------------------------- |
| `--provider` | Use specific provider only    |
| `--preview`  | Show changes without applying |

### Examples

```bash
# Enrich from all sources
colibri publishers enrich abc123

# Preview changes
colibri publishers enrich abc123 --preview

# Use specific provider
colibri publishers enrich abc123 --provider wikidata
```

## colibri publishers delete

Delete a publisher from your library.

```bash
colibri publishers delete <publisher-id>
```

### Behavior

- If publisher has books, deletion is blocked by default
- Use `--force` to delete and orphan the books
- Use `--reassign` to move books to another publisher first

### Options

| Option            | Description                           |
| ----------------- | ------------------------------------- |
| `--force`         | Delete even if books exist            |
| `--reassign <id>` | Move books to another publisher first |

### Examples

```bash
# Delete publisher (fails if books exist)
colibri publishers delete abc123

# Reassign books first
colibri publishers delete abc123 --reassign xyz789

# Force deletion (orphans books)
colibri publishers delete abc123 --force
```

## colibri publishers works

List all works by a publisher.

```bash
colibri publishers works <publisher-id>
```

### Options

| Option    | Description                     |
| --------- | ------------------------------- |
| `--limit` | Number of results (default: 20) |
| `--sort`  | Sort by: title, date, author    |
| `--json`  | Output as JSON                  |

### Examples

```bash
# List works
colibri publishers works abc123

# Sort by publication date
colibri publishers works abc123 --sort date

# Export as JSON
colibri publishers works abc123 --json > penguin-books.json
```

## colibri publishers import

Bulk import publisher data from a CSV file.

```bash
colibri publishers import <csv-file>
```

### CSV Format

```csv
name,location,founded,website,description
"Tor Books","New York, NY",1980,"https://tor.com","SF/Fantasy publisher"
"Orbit Books","London, UK",1974,"https://orbitbooks.net","Science fiction imprint"
```

### Options

| Option      | Description                     |
| ----------- | ------------------------------- |
| `--dry-run` | Preview import without creating |
| `--update`  | Update existing publishers      |

### Examples

```bash
# Import publishers
colibri publishers import publishers.csv

# Preview import
colibri publishers import publishers.csv --dry-run

# Import and update existing
colibri publishers import publishers.csv --update
```

## colibri publishers export

Export publisher data to CSV or JSON.

```bash
colibri publishers export [options]
```

### Options

| Option            | Description                             |
| ----------------- | --------------------------------------- |
| `--format`        | Output format: csv, json (default: csv) |
| `--output`        | Output file path                        |
| `--include-works` | Include work counts                     |

### Examples

```bash
# Export to CSV
colibri publishers export --output publishers.csv

# Export to JSON
colibri publishers export --format json --output publishers.json

# Include work statistics
colibri publishers export --include-works
```

## colibri publishers stats

Show statistics about publishers in your library.

```bash
colibri publishers stats
```

### Output

Displays:

- Total publishers
- Publishers by location
- Top publishers by book count
- Average books per publisher
- Publishers without books

### Examples

```bash
# Show stats
colibri publishers stats

# JSON output
colibri publishers stats --json
```

## Tips and Workflows

### Cleaning Up Duplicates

Find and merge duplicate publishers:

```bash
# List publishers, look for duplicates
colibri publishers list > publishers.txt

# Merge duplicates
colibri publishers merge duplicate-id canonical-id
```

### Enriching Your Library

Enrich all publishers with metadata:

```bash
# Get list of publisher IDs
colibri publishers list --json | jq -r '.[].id' > ids.txt

# Enrich each one
cat ids.txt | while read id; do
  colibri publishers enrich $id
  sleep 1  # Rate limiting
done
```

### Finding Orphaned Publishers

Publishers with no books:

```bash
colibri publishers stats | grep "Publishers without books"
```

### Batch Updates

Update multiple publishers from CSV:

```bash
# Export current data
colibri publishers export --output current.csv

# Edit in spreadsheet
# ... make changes ...

# Import updates
colibri publishers import updated.csv --update
```
