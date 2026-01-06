---
title: "Deep Dive: Series Detection Algorithms"
description: How Colibri automatically detects book series and determines reading order
date: 2025-01-02
author: "Moritz Mazetti <moritz@example.com>"
layout: blog
tags: [metadata, technical, series, algorithms]
excerpt: From *Harry Potter and the Philosopher's Stone* to *A Game of Thrones*, learn how Colibri automatically groups books into series.
series: "Technical Deep Dives"
seriesOrder: 3
relevance: 80
---

Detecting book series automatically is one of Colibri's most useful features. But how do we know that "The Fellowship of the Ring" is part of "The Lord of the Rings"?

## The Series Detection Pipeline

Our series detection runs in three phases:

### Phase 1: Title Analysis

We parse book titles looking for series indicators:

```typescript
const seriesPatterns = [
  /^(.+?)(?:\s*[:#-]\s*|\s+)(?:Book|Vol(?:ume)?|Part|Episode)\s*(\d+)/i,
  /^(.+?)\s*#(\d+)/,
  /^(.+?)\s*\((.+?)\s+#?(\d+)\)/,
];
```

Examples:
- "Dune: Book 1" → Series: "Dune", Order: 1
- "The Expanse #3" → Series: "The Expanse", Order: 3
- "Foundation (Foundation Series #1)" → Series: "Foundation Series", Order: 1

### Phase 2: External Lookups

Not all series are obvious from titles. We query external sources:

```typescript
async function lookupSeries(isbn: string): Promise<SeriesInfo | null> {
  const results = await Promise.all([
    openLibrary.getWork(isbn),
    goodreadsApi.getSeries(isbn),
    wikidataClient.getSeriesInfo(isbn)
  ]);

  return reconcileSeriesResults(results);
}
```

### Phase 3: Clustering

For books without explicit series info, we use clustering:

1. Group books by author
2. Find common title prefixes
3. Look for sequential numbering patterns
4. Validate with publication date order

## Handling Edge Cases

### Prequels and Spin-offs

Some series aren't strictly linear:

```typescript
interface SeriesEntry {
  book: Book;
  order: number;
  orderType: 'publication' | 'chronological' | 'recommended';
  isMainSeries: boolean;
}
```

We track multiple orderings so users can choose.

### Omnibus Editions

When a single book contains multiple series entries:

```typescript
if (book.containsMultiple) {
  return book.contents.map(entry => ({
    ...entry,
    parentBook: book.id
  }));
}
```

### Shared Universes

Some authors have interconnected series (like Brandon Sanderson's Cosmere):

- We maintain universe-level groupings
- Show connections between related series
- Allow filtering by universe

## The Results

| Metric | Score |
|--------|-------|
| Series detected | 89% |
| Correct ordering | 95% |
| False positives | &lt; 2% |

## Configuration Options

Users can customize series detection:

```yaml
# In settings
series:
  autoDetect: true
  preferChronological: false
  groupOmnibus: true
  showUniverseConnections: true
```

## Future Improvements

We're working on:

- Machine learning for ambiguous cases
- User-contributed series corrections
- Better handling of translated titles

The next post in this series will cover cover image quality scoring.
