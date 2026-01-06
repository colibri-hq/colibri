---
title: "Power User Guide: Mastering the Colibri CLI"
description: Advanced techniques for managing your library from the command line
date: 2024-06-25
author: "Alex Chen <alex@example.com>"
layout: blog
tags: [ tutorial, cli, technical, automation ]
excerpt: The web interface is great, but power users know the CLI is where the real magic happens. Learn advanced commands and automation techniques.
relevance: 65
---

While Colibri's web interface is intuitive, the command-line interface unlocks powerful capabilities for automation and batch operations.

## CLI Basics

The Colibri CLI is installed automatically:

```bash
colibri --version
# colibri/3.1.0 darwin-arm64 node-v20.10.0

colibri --help
# Shows all available commands
```

## Working with Works

### Listing Books

```bash
# List all books
colibri works list

# Filter by author
colibri works list --author "Brandon Sanderson"

# Filter by tag
colibri works list --tag fantasy

# Output as JSON for scripting
colibri works list --json | jq '.[] | .title'
```

### Importing Books

```bash
# Import a single file
colibri works add ./book.epub

# Import a directory
colibri works import ./my-books/

# Import with specific collection
colibri works import ./new-books/ --collection "To Read"

# Dry run (see what would be imported)
colibri works import ./books/ --dry-run
```

### Bulk Operations

```bash
# Tag all books by an author
colibri works list --author "Ursula K. Le Guin" --json | \
  jq -r '.[].id' | \
  xargs -I {} colibri works tag {} --add "classic-scifi"

# Export metadata
colibri works export --format csv > library.csv
```

## Managing Creators

```bash
# List all authors
colibri creators list --type author

# Merge duplicate authors
colibri creators merge author-123 author-456

# Update author info
colibri creators update author-123 \
  --name "Ursula K. Le Guin" \
  --wikidata Q180917
```

## Storage Operations

```bash
# Check storage status
colibri storage status

# List all stored files
colibri storage list-objects

# Verify file integrity
colibri storage verify --checksum
```

## Automation Examples

### Nightly Import Script

```bash
#!/bin/bash
# import-new-books.sh

IMPORT_DIR="/mnt/downloads/books"
LOG_FILE="/var/log/colibri-import.log"

echo "$(date): Starting import" >> $LOG_FILE

colibri works import "$IMPORT_DIR" \
  --collection "New Arrivals" \
  --move-after-import \
  >> $LOG_FILE 2>&1

echo "$(date): Import complete" >> $LOG_FILE
```

### Backup Script

```bash
#!/bin/bash
# backup-library.sh

DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/backups/colibri"

# Export metadata
colibri works export --format json > "$BACKUP_DIR/metadata-$DATE.json"

# Backup database
pg_dump colibri > "$BACKUP_DIR/database-$DATE.sql"

# Sync book files
rsync -av /app/books/ "$BACKUP_DIR/books/"
```

### Watch Folder with fswatch

```bash
#!/bin/bash
# watch-folder.sh

WATCH_DIR="/mnt/incoming"

fswatch -0 "$WATCH_DIR" | while read -d "" file; do
  if [[ "$file" =~ \.(epub|mobi|pdf)$ ]]; then
    echo "New book detected: $file"
    colibri works add "$file" --collection "Auto-Import"
  fi
done
```

## Environment Variables

Configure the CLI with environment variables:

```bash
export COLIBRI_API_URL="https://books.example.com"
export COLIBRI_API_KEY="your-api-key"
export COLIBRI_OUTPUT_FORMAT="json"
```

Or use a config file at `~/.colibrirc`:

```yaml
api_url: https://books.example.com
api_key: your-api-key
default_collection: Inbox
output_format: table
```

## Tips and Tricks

### Aliases

Add to your `.bashrc`:

```bash
alias books='colibri works list'
alias addbook='colibri works add'
alias booksearch='colibri works list --search'
```

### Completion

Enable shell completion:

```bash
# Bash
colibri completion bash >> ~/.bashrc

# Zsh
colibri completion zsh >> ~/.zshrc

# Fish
colibri completion fish > ~/.config/fish/completions/colibri.fish
```

### Quiet Mode

For scripts, use quiet mode:

```bash
colibri works add ./book.epub --quiet
# Only outputs the new work ID
```

## Conclusion

The CLI transforms Colibri from a simple library manager into a powerful automation platform. Combined with shell scripts and cron jobs, you can build sophisticated book management workflows.

Check the [CLI reference](/user-guide/cli) for the complete command list.
