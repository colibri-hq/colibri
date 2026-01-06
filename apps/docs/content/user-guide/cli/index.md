---
title: CLI Overview
description: Introduction to the Colibri command-line interface
date: 2024-01-01
order: 1
tags: [cli, terminal, automation, reference]
relevance: 70
---

# CLI Overview

The Colibri CLI (`colibri`) provides command-line access to your library for automation, scripting, and advanced management. It's built with [oclif](https://oclif.io), offering a modern, developer-friendly experience.

## Installation

### Global Installation

Install the CLI globally using npm or pnpm:

```bash
# Using npm
npm install -g @colibri-hq/cli

# Using pnpm
pnpm add -g @colibri-hq/cli

# Using yarn
yarn global add @colibri-hq/cli
```

Verify installation:

```bash
colibri --version
# Output: @colibri-hq/cli/0.0.1 darwin-arm64 node-v24.3.0
```

### Using npx (No Installation)

Run commands without installation using npx:

```bash
npx @colibri-hq/cli <command>
```

This is useful for:

- Trying out the CLI without committing to installation
- Running specific versions: `npx @colibri-hq/cli@latest`
- CI/CD pipelines where global installation isn't desired

### Development Installation

For contributors working on the CLI:

```bash
# Clone the repository
git clone https://github.com/colibri-hq/colibri.git
cd colibri

# Install dependencies
pnpm install

# Link CLI locally
cd apps/cli
pnpm link --global

# Now 'colibri' command uses your local development version
colibri --version
```

## First-Time Setup

### Connecting to Your Instance

Before using the CLI, connect to your Colibri instance's database:

```bash
colibri connect postgres://user:password@host:5432/database
```

The connection string format:

```
postgres://[user]:[password]@[host]:[port]/[database]
```

**Examples**:

```bash
# Local Supabase instance
colibri connect postgres://postgres:postgres@localhost:54322/postgres

# Production database
colibri connect postgres://colibri:secret@db.example.com:5432/colibri

# With instance URL for web features
colibri connect postgres://user:pass@host:5432/db \
  --instance https://colibri.example.com
```

### Configuration Storage

The CLI stores configuration in `~/.config/colibri/`:

```
~/.config/colibri/
├── config.json       # Connection settings, default instance
└── credentials.json  # Authentication tokens (if using web login)
```

**config.json structure**:

```json
{
  "defaultInstance": "https://colibri.example.com/",
  "instances": {
    "https://colibri.example.com/": {
      "databaseUri": "postgres://user:pass@host:5432/db"
    }
  }
}
```

### Multiple Instances

Manage multiple Colibri instances:

```bash
# Add first instance (becomes default)
colibri connect postgres://user:pass@host1:5432/db1 \
  --instance https://instance1.example.com

# Add second instance
colibri connect postgres://user:pass@host2:5432/db2 \
  --instance https://instance2.example.com

# Use specific instance
colibri works list --instance https://instance2.example.com

# Set default instance
colibri settings set defaultInstance https://instance2.example.com
```

## Command Structure

Commands follow a hierarchical topic-based structure:

```bash
colibri <topic> <command> [options] [arguments]
```

### Available Topics

| Topic         | Description                     | Common Commands                   |
| ------------- | ------------------------------- | --------------------------------- |
| `works`       | Manage books and editions       | `add`, `list`, `inspect`          |
| `creators`    | Manage authors and contributors | `add`, `list`, `edit`, `inspect`  |
| `publishers`  | Manage publishers               | `list`, `edit`, `inspect`         |
| `collections` | Manage collections              | `add`, `list`, `delete`           |
| `storage`     | Manage S3 storage               | `connect`, `list-objects`, `copy` |
| `settings`    | Instance settings               | `get`, `set`                      |
| `users`       | User management                 | `add`, `list`, `update`, `remove` |
| `oauth`       | OAuth client management         | `clients add`, `clients list`     |
| `discovery`   | Metadata discovery preview      | `preview`                         |

### Command Aliases

Many commands have shorter aliases:

```bash
# These are equivalent
colibri works list
colibri works ls
colibri works

# Storage commands
colibri storage list-objects
colibri storage list
colibri storage ls

# Creators
colibri creators inspect abc123
colibri creators get abc123
colibri creators show abc123
```

## Getting Help

### Command Help

Get help for any command using `--help`:

```bash
# General help
colibri --help

# Topic help
colibri works --help

# Specific command help
colibri works add --help
```

**Help output includes**:

- Description of the command
- Usage syntax
- Available flags and options
- Command examples
- Related commands

### Examples in Help

The CLI provides contextual examples:

```bash
colibri creators add --help
```

Output:

```
Add a new creator to the database

USAGE
  $ colibri creators add NAME [OPTIONS]

FLAGS
  -s, --sorting-key=<value>    Key used for sorting
  -d, --description=<value>    Description of the creator
  --no-discovery              Disable automatic metadata discovery

EXAMPLES
  $ colibri creators add "J.R.R. Tolkien" --sorting-key "Tolkien, J.R.R."
  $ colibri creators add "Jane Austen" --description "English novelist"
```

## Environment Variables

Configure CLI behavior using environment variables:

| Variable                | Description                | Default                      |
| ----------------------- | -------------------------- | ---------------------------- |
| `COLIBRI_CONFIG_DIR`    | Configuration directory    | `~/.config/colibri`          |
| `COLIBRI_INSTANCE`      | Default instance URL       | (from config)                |
| `COLIBRI_DATABASE_URL`  | Database connection string | (from config)                |
| `COLIBRI_NPM_LOG_LEVEL` | npm log level for plugins  | `warn`                       |
| `COLIBRI_NPM_REGISTRY`  | npm registry for plugins   | `https://registry.npmjs.org` |

**Usage**:

```bash
# Override instance for a single command
COLIBRI_INSTANCE=https://test.example.com colibri works list

# Use custom config directory
COLIBRI_CONFIG_DIR=/tmp/colibri-config colibri connect postgres://...
```

## Output Formats

### Default (Human-Readable)

By default, commands output formatted text:

```bash
colibri creators list
```

Output:

```
Name                    Works   Sort Key
────────────────────────────────────────────────
J.R.R. Tolkien         4       Tolkien, J.R.R.
Jane Austen            6       Austen, Jane
Isaac Asimov           12      Asimov, Isaac
```

### JSON Output

Use `--json` flag for machine-readable output:

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
    "workCount": 4
  }
]
```

### Quiet Mode

Suppress non-essential output with `--quiet`:

```bash
colibri works add book.epub --quiet
# Only outputs errors and final result
```

### Verbose Mode

Show detailed information with `--verbose`:

```bash
colibri works add book.epub --verbose
# Shows: parsing details, metadata extraction, database operations
```

## Scripting and Automation

### Exit Codes

The CLI uses standard exit codes:

- `0` - Success
- `1` - General error
- `2` - Invalid usage (missing arguments, etc.)

**Example script**:

```bash
#!/bin/bash
set -e  # Exit on error

# Add multiple books
for book in *.epub; do
  if colibri works add "$book" --quiet; then
    echo "✓ Added: $book"
  else
    echo "✗ Failed: $book" >&2
  fi
done
```

### JSON Processing with jq

Combine with `jq` for powerful data processing:

```bash
# Count books by language
colibri works list --json | jq 'group_by(.language) | map({language: .[0].language, count: length})'

# Find creators with more than 10 works
colibri creators list --json | jq '.[] | select(.workCount > 10)'

# Export creator names to CSV
colibri creators list --json | jq -r '.[] | [.name, .sortingKey] | @csv' > creators.csv
```

### Batch Operations

Process multiple items efficiently:

```bash
# Import entire directory
find ~/ebooks -name "*.epub" -exec colibri works add {} \;

# Update all creators with missing metadata
colibri creators list --json | \
  jq -r '.[] | select(.description == null) | .id' | \
  xargs -I {} colibri creators edit {} --discover

# Backup all covers
colibri storage list-objects covers/ --json | \
  jq -r '.[].Key' | \
  xargs -I {} aws s3 cp s3://colibri/{} ./backup/{}
```

### Cron Jobs

Schedule regular tasks:

```bash
# Update metadata daily at 2 AM
0 2 * * * /usr/local/bin/colibri discovery preview --all --update >> /var/log/colibri-discovery.log 2>&1

# Clean up old imports weekly
0 0 * * 0 /usr/local/bin/colibri storage rm 'imports/*' --force

# Backup database weekly
0 3 * * 0 pg_dump $(colibri settings get --json | jq -r '.databaseUri') > ~/backups/colibri-$(date +\%Y\%m\%d).sql
```

## Shell Completion

Enable tab completion for your shell:

### Bash

Add to `~/.bashrc`:

```bash
eval "$(colibri autocomplete:script bash)"
```

### Zsh

Add to `~/.zshrc`:

```bash
eval "$(colibri autocomplete:script zsh)"
```

### Fish

Add to `~/.config/fish/config.fish`:

```fish
colibri autocomplete:script fish | source
```

After adding, restart your shell or source the config:

```bash
source ~/.bashrc  # or ~/.zshrc, etc.
```

**Completion features**:

- Command names
- Flag names
- Option values (where applicable)
- File paths for file arguments

## Common Workflows

### Daily Library Management

```bash
# Check recent additions
colibri works list --limit 10 --sort created_at:desc

# Add new books
colibri works add ~/Downloads/new-book.epub

# Update creator information
colibri creators edit abc123 --description "Updated bio"
```

### Bulk Import

```bash
# Import entire directory with metadata discovery
for file in ~/ebooks/*.epub; do
  echo "Processing: $file"
  colibri works add "$file" --verbose
done

# Or using find
find ~/ebooks -type f \( -name "*.epub" -o -name "*.mobi" \) \
  -exec colibri works add {} \;
```

### Metadata Enrichment

```bash
# Preview metadata for a book
colibri discovery preview book.epub

# Preview with overrides
colibri discovery preview book.epub \
  --creator "J.R.R. Tolkien" \
  --language eng

# Search by title and ISBN
colibri discovery preview "The Hobbit" \
  --isbn "978-0547928227" \
  --show-confidence
```

### Storage Management

```bash
# Check storage connection
colibri storage connect \
  --endpoint https://s3.amazonaws.com \
  --access-key-id YOUR_KEY \
  --secret-access-key YOUR_SECRET

# List all objects
colibri storage list-objects

# List specific prefix
colibri storage list-objects --prefix covers/

# Copy objects
colibri storage copy assets/old.epub assets/new.epub
```

### User Administration

```bash
# List all users
colibri users list

# Add new user
colibri users add jane@example.com \
  --name "Jane Doe" \
  --role adult \
  --verified

# Update user role
colibri users update jane@example.com --role admin

# Remove user
colibri users remove jane@example.com --force
```

## Troubleshooting

### Connection Issues

**Problem**: "Unable to connect to database"

**Solutions**:

```bash
# Test connection
colibri connect postgres://user:pass@host:5432/db --verbose

# Check config
cat ~/.config/colibri/config.json

# Verify database is accessible
psql postgres://user:pass@host:5432/db -c "SELECT 1"
```

### Authentication Errors

**Problem**: "Authentication failed"

**Solutions**:

```bash
# Re-authenticate
colibri login --instance https://colibri.example.com

# Clear credentials
rm ~/.config/colibri/credentials.json
colibri login
```

### Command Not Found

**Problem**: `colibri: command not found`

**Solutions**:

```bash
# Check if installed globally
npm list -g @colibri-hq/cli

# Reinstall
npm uninstall -g @colibri-hq/cli
npm install -g @colibri-hq/cli

# Or use npx
npx @colibri-hq/cli <command>
```

### Invalid Configuration

**Problem**: "Invalid configuration"

**Solutions**:

```bash
# Reset configuration
rm -rf ~/.config/colibri
colibri connect postgres://...

# Validate config manually
cat ~/.config/colibri/config.json | jq
```

### Plugin Errors

**Problem**: "Plugin failed to load"

**Solutions**:

```bash
# List installed plugins
colibri plugins

# Update plugins
colibri plugins update

# Reset plugins
colibri plugins reset

# Reinstall CLI
npm uninstall -g @colibri-hq/cli
npm install -g @colibri-hq/cli
```

## Global Flags

These flags work with all commands:

| Flag            | Short | Description                   |
| --------------- | ----- | ----------------------------- |
| `--help`        | `-h`  | Show help for command         |
| `--version`     | -     | Show CLI version              |
| `--json`        | -     | Output in JSON format         |
| `--quiet`       | -     | Suppress non-essential output |
| `--verbose`     | `-v`  | Show verbose output           |
| `--config-file` | `-c`  | Use specific config file      |
| `--instance`    | `-i`  | Override instance URL         |

## Best Practices

1. **Use version control for scripts**: Keep your automation scripts in git
2. **Test with `--json` and `jq`**: Parse output programmatically for reliability
3. **Handle errors**: Always check exit codes in scripts
4. **Use `--verbose` for debugging**: Helps diagnose issues
5. **Keep credentials secure**: Never hardcode passwords in scripts
6. **Set up shell completion**: Improves productivity significantly
7. **Use `--quiet` in cron jobs**: Reduces log noise
8. **Back up before bulk operations**: Especially with delete/update commands

## Next Steps

- [Manage creators](/user-guide/cli/creators) - Add and edit authors
- [Storage operations](/user-guide/cli/storage) - Work with S3 storage
- [Works management](/user-guide/cli/works) - Import and manage books
- [User administration](/user-guide/cli/users) - Manage instance users
- [OAuth clients](/user-guide/cli/oauth) - Set up API integrations

## Resources

- [oclif Documentation](https://oclif.io) - CLI framework used by Colibri
- [jq Manual](https://stedolan.github.io/jq/manual/) - JSON processing
- [GitHub Repository](https://github.com/colibri-hq/colibri) - Source code and issues
