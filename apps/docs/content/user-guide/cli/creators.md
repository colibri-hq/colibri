---
title: Creators Commands
description: CLI commands for managing creators (authors and contributors)
date: 2024-01-01
order: 3
tags: [cli, creators, authors, reference]
relevance: 60
---

# Creators Commands

Manage authors, illustrators, translators, and other contributors in your library using the CLI. This guide covers all creator-related commands.

## colibri creators list

List all creators in your library with optional filtering and search.

```bash
colibri creators list [options]
```

### Options

| Option     | Short | Description                       | Default |
| ---------- | ----- | --------------------------------- | ------- |
| `--limit`  | -     | Number of results to return       | 20      |
| `--search` | -     | Search by name                    | -       |
| `--json`   | -     | Output as JSON                    | false   |
| `--offset` | -     | Number of results to skip         | 0       |
| `--sort`   | -     | Sort order (name, works, created) | name    |

### Examples

**Basic listing**:

```bash
colibri creators list
```

Output:

```
Name                    Works   Sort Key                ID
─────────────────────────────────────────────────────────────────
J.R.R. Tolkien         4       Tolkien, J.R.R.         abc123
Jane Austen            6       Austen, Jane            def456
Isaac Asimov           12      Asimov, Isaac           ghi789
```

**Search by name**:

```bash
colibri creators list --search "Tolkien"
```

**JSON output**:

```bash
colibri creators list --json
```

Output:

```json
[
  {
    "id": "abc123",
    "name": "J.R.R. Tolkien",
    "sortingKey": "Tolkien, J.R.R.",
    "description": "English writer and philologist...",
    "workCount": 4,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

**Pagination**:

```bash
# First 50 creators
colibri creators list --limit 50

# Next 50 creators
colibri creators list --limit 50 --offset 50
```

**Export to CSV**:

```bash
colibri creators list --json | \
  jq -r '.[] | [.name, .sortingKey, .workCount] | @csv' > creators.csv
```

## colibri creators add

Add a new creator manually to your library.

```bash
colibri creators add <name> [options]
```

### Arguments

- `<name>` - Full name of the creator (required)

### Options

| Option            | Short | Description                          |
| ----------------- | ----- | ------------------------------------ |
| `--sort-name`     | `-s`  | Name for alphabetical sorting        |
| `--bio`           | `-d`  | Biography or description             |
| `--birth-date`    | -     | Birth date (YYYY-MM-DD)              |
| `--death-date`    | -     | Death date (YYYY-MM-DD)              |
| `--image`         | `-I`  | Path to profile image file           |
| `--url`           | `-u`  | Personal website URL                 |
| `--wikipedia-url` | `-w`  | Wikipedia page URL                   |
| `--amazon-id`     | `-a`  | Amazon Author ID                     |
| `--goodreads-id`  | `-g`  | Goodreads Author ID                  |
| `--no-discovery`  | -     | Disable automatic metadata discovery |

### Examples

**Simple creator**:

```bash
colibri creators add "J.R.R. Tolkien"
```

**With sorting key**:

```bash
colibri creators add "J.R.R. Tolkien" --sort-name "Tolkien, J.R.R."
```

**Complete profile**:

```bash
colibri creators add "Jane Austen" \
  --sort-name "Austen, Jane" \
  --birth-date 1775-12-16 \
  --death-date 1817-07-18 \
  --bio "English novelist known for Pride and Prejudice" \
  --wikipedia-url "https://en.wikipedia.org/wiki/Jane_Austen"
```

**With profile image**:

```bash
colibri creators add "Isaac Asimov" \
  --image ~/images/asimov.jpg \
  --url "https://www.asimovonline.com"
```

**Disable automatic discovery**:

```bash
# Add creator without fetching metadata from external sources
colibri creators add "Unknown Author" --no-discovery
```

### Automatic Metadata Discovery

By default, when adding a creator, Colibri attempts to:

1. **Search external sources** (WikiData, ISNI, VIAF)
2. **Enrich missing fields** with discovered data
3. **Download profile image** if available
4. **Link identifiers** for future reference

To skip this process, use `--no-discovery`.

## colibri creators inspect

View detailed information about a specific creator and their works.

```bash
colibri creators inspect <identifier>
```

### Arguments

- `<identifier>` - Creator ID or name

### Aliases

```bash
colibri creators get <identifier>
colibri creators show <identifier>
```

### Examples

**By ID**:

```bash
colibri creators inspect abc123
```

Output:

```
Creator: J.R.R. Tolkien
ID: abc123
Sort Key: Tolkien, J.R.R.
Born: 1892-01-03
Died: 1973-09-02

Description:
English writer and philologist, best known as the author of The Hobbit
and The Lord of the Rings.

Identifiers:
- WikiData: Q892
- VIAF: 95218067
- ISNI: 0000000121441970

Works (4):
- The Hobbit
- The Fellowship of the Ring
- The Two Towers
- The Return of the King
```

**By name**:

```bash
colibri creators inspect "J.R.R. Tolkien"
```

**JSON output**:

```bash
colibri creators inspect abc123 --json
```

Output:

```json
{
  "id": "abc123",
  "name": "J.R.R. Tolkien",
  "sortingKey": "Tolkien, J.R.R.",
  "description": "English writer and philologist...",
  "birthDate": "1892-01-03",
  "deathDate": "1973-09-02",
  "identifiers": {
    "wikidata": "Q892",
    "viaf": "95218067",
    "isni": "0000000121441970"
  },
  "works": [...]
}
```

## colibri creators edit

Edit an existing creator's metadata.

```bash
colibri creators edit <identifier> [options]
```

### Arguments

- `<identifier>` - Creator ID or name

### Options

| Option            | Short | Description                |
| ----------------- | ----- | -------------------------- |
| `--name`          | `-n`  | Update display name        |
| `--sort-name`     | `-s`  | Update sort name           |
| `--bio`           | `-d`  | Update biography           |
| `--birth-date`    | -     | Update birth date          |
| `--death-date`    | -     | Update death date          |
| `--image`         | `-I`  | Update profile image       |
| `--url`           | `-u`  | Update website URL         |
| `--wikipedia-url` | `-w`  | Update Wikipedia URL       |
| `--amazon-id`     | `-a`  | Update Amazon Author ID    |
| `--goodreads-id`  | `-g`  | Update Goodreads Author ID |

### Examples

**Update name**:

```bash
colibri creators edit abc123 --name "J.R.R. Tolkien (Updated)"
```

**Update biography**:

```bash
colibri creators edit abc123 \
  --bio "English writer, poet, philologist, and academic..."
```

**Add identifiers**:

```bash
colibri creators edit abc123 \
  --wikipedia-url "https://en.wikipedia.org/wiki/J._R._R._Tolkien" \
  --amazon-id "B000AP9A6K"
```

**Update profile image**:

```bash
colibri creators edit abc123 --image ~/new-photo.jpg
```

**Bulk update via script**:

```bash
# Update all creators missing sort keys
colibri creators list --json | \
  jq -r '.[] | select(.sortingKey == null) | .id' | \
  while read id; do
    name=$(colibri creators inspect "$id" --json | jq -r '.name')
    # Generate sort key (Last, First)
    sort_key=$(echo "$name" | awk '{print $NF", "$1" "$2}')
    colibri creators edit "$id" --sort-name "$sort_key"
  done
```

## colibri creators delete

Remove a creator from your library.

```bash
colibri creators delete <identifier> [options]
```

### Arguments

- `<identifier>` - Creator ID or name

### Options

| Option         | Short | Description                         |
| -------------- | ----- | ----------------------------------- |
| `--force`      | `-f`  | Skip confirmation prompt            |
| `--keep-works` | -     | Keep associated works (unlink only) |

### Examples

**With confirmation**:

```bash
colibri creators delete abc123
```

Output:

```
Warning: This will delete "J.R.R. Tolkien" and unlink 4 works.
Are you sure? (y/N): y
Deleted creator abc123
```

**Force delete**:

```bash
colibri creators delete abc123 --force
```

**Keep works**:

```bash
# Removes creator but keeps works in library
colibri creators delete abc123 --keep-works
```

> **Note**: Deleting a creator doesn't delete their works by default. Works become "orphaned" and can be re-linked to another creator.

## Working with External Identifiers

### Linking to WikiData

WikiData provides comprehensive biographical information:

```bash
colibri creators edit abc123 \
  --wikidata-id Q892  # Tolkien's WikiData ID
```

This enables:

- Automatic metadata enrichment
- Cross-reference with other databases
- Access to structured biographical data

### Linking to VIAF

Virtual International Authority File for library catalogs:

```bash
colibri creators edit abc123 \
  --viaf-id 95218067
```

### Linking to ISNI

International Standard Name Identifier:

```bash
colibri creators edit abc123 \
  --isni 0000000121441970
```

### Discovery Integration

Use the discovery command to find identifiers:

```bash
# Search for creator metadata
colibri discovery preview --creator "J.R.R. Tolkien" --show-raw
```

## Bulk Operations

### Import from CSV

Create a CSV file (`creators.csv`):

```csv
name,sortingKey,birthDate,description
"J.R.R. Tolkien","Tolkien, J.R.R.",1892-01-03,"English writer"
"Jane Austen","Austen, Jane",1775-12-16,"English novelist"
```

Import script:

```bash
#!/bin/bash
tail -n +2 creators.csv | while IFS=',' read -r name sortKey birthDate desc; do
  colibri creators add "$name" \
    --sort-name "$sortKey" \
    --birth-date "$birthDate" \
    --bio "$desc"
done
```

### Export for Backup

```bash
# Export all creators to JSON
colibri creators list --json > creators-backup.json

# Export to CSV
colibri creators list --json | \
  jq -r '["Name","Sort Key","Birth Date","Works"],
         (.[] | [.name, .sortingKey, .birthDate, .workCount]) | @csv' \
  > creators-export.csv
```

### Batch Updates

Update all creators with missing descriptions:

```bash
colibri creators list --json | \
  jq -r '.[] | select(.description == null) | .id' | \
  xargs -I {} sh -c 'colibri creators edit {} --discover'
```

## Integration with Metadata Discovery

### Preview Metadata Before Adding

```bash
# Search for creator metadata
colibri discovery preview "J.R.R. Tolkien" --show-confidence
```

This shows available metadata from various sources before creating the creator record.

### Enrich Existing Creators

```bash
# Fetch additional metadata for existing creator
colibri creators edit abc123 --discover
```

This queries external sources and updates empty fields.

## Common Workflows

### Adding Multiple Creators

```bash
# From a list of names
cat names.txt | while read name; do
  colibri creators add "$name"
done
```

### Finding Creators Without Works

```bash
colibri creators list --json | \
  jq '.[] | select(.workCount == 0)'
```

### Merging Duplicate Creators

```bash
# Find potential duplicates
colibri creators list --json | \
  jq 'group_by(.sortingKey) | .[] | select(length > 1)'

# Manually merge by moving works
# (this requires work editing commands)
```

### Cleaning Up Sort Keys

```bash
# Find creators without sort keys
colibri creators list --json | \
  jq -r '.[] | select(.sortingKey == null) | "\(.id)\t\(.name)"'

# Update with generated sort keys
# (implement custom logic based on your naming conventions)
```

## JSON Output Examples

### Full Creator Details

```bash
colibri creators inspect abc123 --json
```

```json
{
  "id": "abc123",
  "name": "J.R.R. Tolkien",
  "sortingKey": "Tolkien, J.R.R.",
  "description": "English writer and philologist...",
  "birthDate": "1892-01-03",
  "deathDate": "1973-09-02",
  "url": "https://www.tolkienestate.com",
  "wikipediaUrl": "https://en.wikipedia.org/wiki/J._R._R._Tolkien",
  "imageUrl": "https://storage.example.com/creators/abc123.jpg",
  "identifiers": {
    "wikidata": "Q892",
    "viaf": "95218067",
    "isni": "0000000121441970",
    "amazonId": "B000AP9A6K",
    "goodreadsId": "656983"
  },
  "works": [
    { "id": "work123", "title": "The Hobbit", "role": "author" },
    { "id": "work456", "title": "The Fellowship of the Ring", "role": "author" }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:45:00Z"
}
```

### List with Filters

```bash
colibri creators list --search "Tolkien" --json
```

```json
[
  { "id": "abc123", "name": "J.R.R. Tolkien", "sortingKey": "Tolkien, J.R.R.", "workCount": 4 },
  {
    "id": "xyz789",
    "name": "Christopher Tolkien",
    "sortingKey": "Tolkien, Christopher",
    "workCount": 2
  }
]
```

## Troubleshooting

### Creator Not Found

**Problem**: "Creator not found: abc123"

**Solutions**:

```bash
# Search by name instead
colibri creators list --search "Tolkien"

# List all creators to find correct ID
colibri creators list
```

### Duplicate Creators

**Problem**: Same author added multiple times

**Solutions**:

```bash
# Find duplicates
colibri creators list --json | \
  jq 'group_by(.sortingKey) | .[] | select(length > 1)'

# Manually merge by choosing primary ID and deleting duplicates
colibri creators delete duplicate-id --keep-works
```

### Missing Metadata

**Problem**: Creator has no biography or identifiers

**Solutions**:

```bash
# Attempt automatic discovery
colibri creators edit abc123 --discover

# Or add manually
colibri creators edit abc123 \
  --bio "Biography here" \
  --wikipedia-url "https://..."
```

### Image Upload Fails

**Problem**: "Failed to upload image"

**Solutions**:

```bash
# Check file exists and is readable
ls -lh ~/image.jpg

# Verify file format (JPG, PNG supported)
file ~/image.jpg

# Check file size (< 10MB recommended)
du -h ~/image.jpg

# Test with smaller image
convert ~/image.jpg -resize 800x800 ~/image-small.jpg
colibri creators edit abc123 --image ~/image-small.jpg
```

## Best Practices

1. **Use consistent naming**: Follow a standard format (e.g., "First Last")
2. **Always set sort keys**: Especially important for "Last, First" alphabetization
3. **Link identifiers**: Enables automatic metadata enrichment
4. **Add descriptions**: Helps users discover related works
5. **Use `--no-discovery` sparingly**: Auto-discovery saves time
6. **Export regularly**: Backup creator data with JSON exports
7. **Verify before bulk delete**: Always preview with `--json` first

## See Also

- [Works Commands](/user-guide/cli/works) - Manage books and link to creators
- [CLI Overview](/user-guide/cli) - General CLI usage
- [Publishers Commands](/user-guide/cli/publishers) - Similar workflow for publishers

## Related API Endpoints

For programmatic access, see:

- `GET /api/creators` - List creators
- `POST /api/creators` - Create creator
- `GET /api/creators/:id` - Get creator details
- `PATCH /api/creators/:id` - Update creator
- `DELETE /api/creators/:id` - Delete creator
