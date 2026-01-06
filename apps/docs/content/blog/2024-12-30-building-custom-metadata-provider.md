---
title: "Building a Custom Metadata Provider"
description: Step-by-step guide to creating your own metadata provider plugin for Colibri
date: 2024-12-30
author: "Sarah Mitchell <sarah@example.com>"
layout: blog
tags: [technical, metadata, sdk, tutorial, open-library]
excerpt: Want to add a new metadata source? This guide walks you through building a custom provider using the Colibri SDK.
relevance: 60
---

Colibri's metadata system is extensible. If your favorite book database isn't supported, you can build your own provider.

## Prerequisites

Before starting, you should be familiar with:

- TypeScript basics
- The Colibri SDK
- REST APIs

## The Provider Interface

All metadata providers implement a common interface:

```typescript
interface MetadataProvider {
  readonly id: string;
  readonly name: string;
  readonly priority: number;

  search(query: SearchQuery): Promise<SearchResult[]>;
  getDetails(id: string): Promise<BookMetadata>;
  getCover(id: string): Promise<CoverImage | null>;
}
```

## Step 1: Create the Provider Class

Let's build a provider for a fictional "BookDB" service:

```typescript
// providers/bookdb.ts
import { MetadataProvider, SearchQuery, SearchResult, BookMetadata } from '@colibri-hq/sdk';

export class BookDBProvider implements MetadataProvider {
  readonly id = 'bookdb';
  readonly name = 'BookDB';
  readonly priority = 50; // Lower = higher priority

  private apiKey: string;
  private baseUrl = 'https://api.bookdb.example.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
}
```

## Step 2: Implement Search

```typescript
async search(query: SearchQuery): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query.title || '',
    author: query.author || '',
    isbn: query.isbn || '',
  });

  const response = await fetch(
    `${this.baseUrl}/search?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    }
  );

  const data = await response.json();

  return data.books.map((book: any) => ({
    providerId: this.id,
    externalId: book.id,
    title: book.title,
    author: book.author_name,
    year: book.publication_year,
    confidence: this.calculateConfidence(book, query),
  }));
}
```

## Step 3: Implement Get Details

```typescript
async getDetails(externalId: string): Promise<BookMetadata> {
  const response = await fetch(
    `${this.baseUrl}/books/${externalId}`,
    {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    }
  );

  const book = await response.json();

  return {
    title: book.title,
    authors: book.authors.map((a: any) => ({
      name: a.name,
      role: a.role || 'author',
    })),
    description: book.description,
    publisher: book.publisher?.name,
    publishedDate: book.publication_date,
    isbn10: book.isbn10,
    isbn13: book.isbn13,
    pageCount: book.pages,
    language: book.language,
    genres: book.genres,
    series: book.series ? {
      name: book.series.name,
      position: book.series.position,
    } : undefined,
  };
}
```

## Step 4: Implement Cover Fetching

```typescript
async getCover(externalId: string): Promise<CoverImage | null> {
  const response = await fetch(
    `${this.baseUrl}/books/${externalId}/cover`,
    {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const buffer = await response.arrayBuffer();

  return {
    data: Buffer.from(buffer),
    mimeType: response.headers.get('content-type') || 'image/jpeg',
    width: 0, // Will be detected
    height: 0,
  };
}
```

## Step 5: Calculate Confidence

```typescript
private calculateConfidence(book: any, query: SearchQuery): number {
  let confidence = 50; // Base confidence

  // Exact ISBN match is very high confidence
  if (query.isbn && (book.isbn10 === query.isbn || book.isbn13 === query.isbn)) {
    confidence += 45;
  }

  // Title similarity
  if (query.title) {
    const similarity = this.stringSimilarity(book.title, query.title);
    confidence += similarity * 20;
  }

  // Author match
  if (query.author) {
    const authorMatch = book.author_name
      .toLowerCase()
      .includes(query.author.toLowerCase());
    if (authorMatch) {
      confidence += 15;
    }
  }

  return Math.min(confidence, 100);
}

private stringSimilarity(a: string, b: string): number {
  // Implement Levenshtein or similar
  // Returns 0-1
}
```

## Step 6: Register the Provider

```typescript
// In your configuration
import { registerProvider } from '@colibri-hq/sdk';
import { BookDBProvider } from './providers/bookdb';

registerProvider(new BookDBProvider(process.env.BOOKDB_API_KEY!));
```

## Step 7: Configuration

Add provider settings to Colibri:

```typescript
// settings/metadata-providers.ts
export const bookdbSettings = {
  id: 'bookdb',
  name: 'BookDB',
  fields: [
    {
      key: 'apiKey',
      type: 'password',
      label: 'API Key',
      required: true,
    },
    {
      key: 'priority',
      type: 'number',
      label: 'Priority',
      default: 50,
    },
  ],
};
```

## Testing Your Provider

```typescript
import { describe, it, expect } from 'vitest';
import { BookDBProvider } from './bookdb';

describe('BookDBProvider', () => {
  const provider = new BookDBProvider('test-key');

  it('should search by ISBN', async () => {
    const results = await provider.search({
      isbn: '978-0-13-468599-1',
    });

    expect(results).toHaveLength(1);
    expect(results[0].title).toContain('Clean Code');
  });

  it('should fetch book details', async () => {
    const details = await provider.getDetails('book-123');

    expect(details.title).toBeDefined();
    expect(details.authors).toHaveLength(1);
  });
});
```

## Error Handling

Providers should handle errors gracefully:

```typescript
async search(query: SearchQuery): Promise<SearchResult[]> {
  try {
    const response = await fetch(/* ... */);

    if (!response.ok) {
      console.warn(`BookDB API error: ${response.status}`);
      return [];
    }

    return /* ... */;
  } catch (error) {
    console.error('BookDB provider error:', error);
    return [];
  }
}
```

## Rate Limiting

Respect API rate limits:

```typescript
import { RateLimiter } from '@colibri-hq/sdk';

export class BookDBProvider implements MetadataProvider {
  private rateLimiter = new RateLimiter({
    maxRequests: 100,
    perSeconds: 60,
  });

  async search(query: SearchQuery): Promise<SearchResult[]> {
    await this.rateLimiter.acquire();
    // ... rest of implementation
  }
}
```

## Conclusion

Custom metadata providers let you integrate any book database with Colibri. The key is implementing the interface correctly and handling edge cases gracefully.

For more details, see the [SDK metadata documentation](/packages/sdk/metadata).
