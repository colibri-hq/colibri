---
title: User Guide
description: Complete documentation for using Colibri to manage your ebook library
date: 2024-01-01
order: 1
tags: [guide, documentation, features, reference]
relevance: 90
---

# User Guide

Welcome to the Colibri User Guide. This comprehensive documentation covers everything you need to know about using Colibri to manage your ebook library, from basic operations to advanced features.

## Getting Started with Your Library

Once you have Colibri installed and configured, you're ready to start building your digital library. This guide will walk you through all the features available to help you organize, discover, and enjoy your ebook collection.

### Essential Features

| Feature                                              | Description                         | Guide                                         |
| ---------------------------------------------------- | ----------------------------------- | --------------------------------------------- |
| [Uploading Books](/user-guide/uploading-books)       | Import ebooks into your library     | Add EPUB, MOBI, and PDF files                 |
| [Library Management](/user-guide/library-management) | Browse and organize your collection | Navigate, filter, and sort books              |
| [Collections](/user-guide/collections)               | Create custom reading lists         | Group books by theme, status, or any criteria |
| [Search](/user-guide/search)                         | Find books quickly                  | Full-text search across your library          |

### Enrichment & Metadata

| Feature                                                | Description              | Guide                                  |
| ------------------------------------------------------ | ------------------------ | -------------------------------------- |
| [Metadata Enrichment](/user-guide/metadata-enrichment) | Enhance book information | Fetch data from 14+ metadata providers |
| [Reviews & Ratings](/user-guide/reviews-ratings)       | Rate and review books    | Track your reading experience          |

### Administration

| Feature                                      | Description                   | Guide                              |
| -------------------------------------------- | ----------------------------- | ---------------------------------- |
| [Authentication](/user-guide/authentication) | Secure access to your library | Passkeys, OAuth, and API keys      |
| [Settings](/user-guide/settings)             | Configure your instance       | Customize behavior and preferences |

## Command Line Interface

For power users and automation, Colibri provides a comprehensive CLI tool.

- [CLI Overview](/user-guide/cli) - Installation and basic usage
- [Works Commands](/user-guide/cli/works) - Manage books and editions
- [Creators Commands](/user-guide/cli/creators) - Manage authors and contributors
- [Publishers Commands](/user-guide/cli/publishers) - Manage publishers
- [Storage Commands](/user-guide/cli/storage) - Work with S3 storage
- [Users Commands](/user-guide/cli/users) - User administration
- [OAuth Commands](/user-guide/cli/oauth) - API integrations

## API Reference

Colibri exposes a type-safe API for programmatic access.

- [API Overview](/user-guide/api) - Introduction to the API
- [tRPC Reference](/user-guide/api/trpc-reference) - Detailed endpoint documentation

## Plugins

Extend Colibri with plugins for additional functionality.

- [Plugins Overview](/user-guide/plugins) - Plugin system documentation

## Quick Reference

### Supported Ebook Formats

| Format | Extension                | Features                                    |
| ------ | ------------------------ | ------------------------------------------- |
| EPUB   | `.epub`                  | Full metadata extraction, cover images, TOC |
| MOBI   | `.mobi`, `.azw`, `.azw3` | Kindle format support, ASIN extraction      |
| PDF    | `.pdf`                   | Metadata extraction, page count             |

### Keyboard Shortcuts

| Shortcut       | Action         |
| -------------- | -------------- |
| `/` or `Cmd+K` | Open search    |
| `Escape`       | Close dialogs  |
| `Enter`        | Confirm action |

### User Roles

| Role  | Capabilities                                  |
| ----- | --------------------------------------------- |
| Admin | Full system access, user management, settings |
| Adult | Full library access, personal collections     |
| Child | Filtered content, age-appropriate access      |

## Best Practices

### Organizing Your Library

1. **Use consistent metadata**: Take time to verify and correct book metadata after import
2. **Create meaningful collections**: Organize by reading status, genre, or personal categories
3. **Enable auto-enrichment**: Let Colibri fetch metadata automatically during import
4. **Regular backups**: Export your library data periodically

### Performance Tips

1. **Batch imports**: Import multiple books at once rather than one at a time
2. **Use the CLI for large operations**: The CLI is optimized for bulk tasks
3. **Configure caching**: Enable metadata caching to reduce API calls

## Getting Help

- **[Troubleshooting](/setup/troubleshooting)**: Common issues and solutions
- **[GitHub Issues](https://github.com/colibri-hq/colibri/issues)**: Report bugs or request features
- **[Contributing](/getting-started/contributing)**: Help improve Colibri
