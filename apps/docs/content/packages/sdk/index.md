---
title: SDK Overview
description: Core SDK for Colibri - database, metadata, storage, and ebook parsing
date: 2024-01-01
order: 1
tags: [sdk, database, storage, developers]
relevance: 75
---

# SDK Overview

The `@colibri-hq/sdk` package provides the core functionality for Colibri, including database operations, metadata providers, storage abstraction, and ebook parsing.

## Installation

```bash
npm install @colibri-hq/sdk
```

## Module Exports

The SDK provides multiple entry points for different use cases:

```typescript
// Main module - database and resources
import { createDatabase, Work, Creator } from "@colibri-hq/sdk";

// Metadata providers
import { MetadataAggregator, OpenLibraryMetadataProvider } from "@colibri-hq/sdk/metadata";

// Ingestion pipeline
import { ingestEbook, detectDuplicates } from "@colibri-hq/sdk/ingestion";

// Storage abstraction
import { createStorage, uploadFile } from "@colibri-hq/sdk/storage";

// Ebook parsing
import { parseEpub, parseMobi } from "@colibri-hq/sdk/ebooks";

// Settings management
import { SettingsRegistry } from "@colibri-hq/sdk/settings";

// Type definitions
import type { WorkData, CreatorData } from "@colibri-hq/sdk/types";
```

## Quick Start

### Database Connection

```typescript
import { createDatabase } from "@colibri-hq/sdk";

const db = createDatabase({ connectionString: process.env.DATABASE_URL });
```

### Metadata Search

```typescript
import { MetadataAggregator, OpenLibraryMetadataProvider } from "@colibri-hq/sdk/metadata";

const aggregator = new MetadataAggregator([new OpenLibraryMetadataProvider()]);

const results = await aggregator.searchByISBN("978-0-14-028329-7");
console.log(results[0].title); // "The Great Gatsby"
```

### Parse an Ebook

```typescript
import { parseEpub } from "@colibri-hq/sdk/ebooks";

const metadata = await parseEpub(fileBuffer);
console.log(metadata.title, metadata.authors);
```

## Detailed Documentation

- [Metadata](/packages/sdk/metadata) - Metadata providers and aggregation
- [Ingestion](/packages/sdk/ingestion) - Ebook ingestion pipeline
