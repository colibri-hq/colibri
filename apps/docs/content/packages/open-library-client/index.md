---
title: Open Library Client
description: Full-featured client for the Open Library API
date: 2024-01-01
order: 1
tags: [open-library, metadata, api, developers]
relevance: 55
---

# Open Library Client

A comprehensive client for the Open Library API, providing a simple interface to access Open Library's vast collection of book metadata. Works in both Node.js and browser environments with full TypeScript support.

## Installation

```bash
npm install @colibri-hq/open-library-client
# or
pnpm add @colibri-hq/open-library-client
```

## Quick Start

Create a client instance with your contact information (required to avoid rate limiting):

```typescript
import { Client } from "@colibri-hq/open-library-client";

const contactInfo = "myemail@example.com";
const client = new Client(contactInfo);

// Search for books
for await (const book of client.searchBook("The Great Gatsby")) {
  console.log(book.title);
  console.log(book.author_name);
  console.log(book.first_publish_year);
}
```

---

## Supported APIs

The client supports all major Open Library public endpoints:

- **Book Search API** - Search for books by title, author, ISBN, subject, etc.
- **Work & Edition API** - Load detailed work and edition data
- **Authors API** - Get author information and works
- **Author Search API** - Search for authors by name
- **Subjects API** - Browse books by subject
- **Covers API** - Access book cover images

---

## Searching for Books

### Simple Search

Search with a plain string query:

```typescript
const searchResults = client.searchBook("The Great Gatsby");

// Iterate over all results (automatically paginated)
for await (const book of searchResults) {
  console.log(`${book.title} by ${book.author_name?.join(", ")}`);
  console.log(`Published: ${book.first_publish_year}`);
  console.log(`ISBN: ${book.isbn?.[0]}`);
}
```

### Advanced Query Builder

Use the query builder for precise searches:

```typescript
const searchResults = client.searchBook({
  title: "The Great Gatsby",
  author: "F. Scott Fitzgerald",
  publish_year: { from: 1920, to: 1930 },
  subject: ["American fiction", "Classics"],
  language: "eng",
});

// Collect all results into an array
const books = await Array.fromAsync(searchResults);
console.log(`Found ${books.length} books`);
```

### Query Builder Examples

| Expression        | Query                                                                | SOLR Query                                                           |
| ----------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Single keyword    | `{ title: "flammable" }`                                             | `title:flammable`                                                    |
| Exact match       | `{ title_suggest: "vitamin a" }`                                     | `title:"vitamin a"`                                                  |
| Multiple keywords | `{ subject: ["tennis", "rules"] }`                                   | `subject:(tennis rules)`                                             |
| Numeric fields    | `{ publish_year: 2015 }`                                             | `publish_year:2015`                                                  |
| Range query       | `{ publish_year: { from: 2010, to: 2020 } }`                         | `publish_year:[2010 TO 2020]`                                        |
| Open-ended range  | `{ publish_year: { from: 2010 } }`                                   | `publish_year:[2010 TO *]`                                           |
| OR construct      | `{ subject: ["dogs", ["Juvenile fiction", "Juvenile literature"]] }` | `subject:dogs subject:("Juvenile fiction" OR "Juvenile literature")` |
| Negative query    | `{ "!author_key": "OL3415A" }`                                       | `NOT author_key:OL3415A`                                             |

### Search Options

Customize your search with options:

```typescript
const searchResults = client.searchBook("The Great Gatsby", {
  limit: 10, // Results per page
  offset: 500, // Skip first 500 results
  sortBy: "new", // Sort by newest first
  fields: ["title", "author_name", "publish_year"], // Specific fields only
  language: "en", // Re-rank by language preference
});
```

**Available Options:**

| Parameter  | Description                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `fields`   | Array of fields to return. Use `'*'` for all fields (expensive). Add `'availability'` for archive.org availability data. |
| `sortBy`   | Sort facet: `'new'`, `'old'`, `'random'`, `'key'`, `'rating'`, `'want_to_read'`, `'currently_reading'`, `'already_read'` |
| `language` | ISO 639-1 language code. Influences ranking but doesn't exclude results.                                                 |
| `offset`   | Number of results to skip (for pagination)                                                                               |
| `limit`    | Maximum results per page                                                                                                 |

---

## Working with Works and Editions

### Load a Work

Get detailed information about a work:

```typescript
const work = await client.loadWork("OL45804W");

if (work) {
  console.log("Title:", work.title);
  console.log(
    "Authors:",
    work.authors?.map((a) => a.author.key),
  );
  console.log("Description:", work.description);
  console.log("Subjects:", work.subjects);
  console.log("First published:", work.first_publish_date);
}
```

### Load an Edition

Get a specific edition by Open Library key:

```typescript
const edition = await client.loadEdition("OL7353617M");

console.log("Title:", edition.title);
console.log("ISBN:", edition.isbn_13);
console.log("Publisher:", edition.publishers);
console.log("Pages:", edition.number_of_pages);
console.log("Format:", edition.physical_format);
```

### Load an Edition by ISBN

Look up an edition using its ISBN:

```typescript
const edition = await client.loadEditionByIsbn("9780141182636");

if (edition) {
  console.log("Found:", edition.title);
  console.log("Work:", edition.works?.[0]?.key); // Link to work
} else {
  console.log("ISBN not found");
}
```

### Load Work Editions

Get all editions of a work:

```typescript
const editions = client.loadEditionsByWorkId("OL45804W");

for await (const edition of editions) {
  console.log(`${edition.title} (${edition.publish_date})`);
  console.log(`  Publisher: ${edition.publishers?.join(", ")}`);
  console.log(`  ISBN: ${edition.isbn_13?.[0] || edition.isbn_10?.[0]}`);
}
```

---

## Working with Authors

### Load an Author

Get author information:

```typescript
const author = await client.loadAuthor("OL23919A");

if (author) {
  console.log("Name:", author.name);
  console.log("Birth:", author.birth_date);
  console.log("Death:", author.death_date);
  console.log("Bio:", author.bio);
  console.log("Photo:", author.photos?.[0]);
}
```

### Search for Authors

Find authors by name:

```typescript
// Simple search
for await (const author of client.searchAuthor("F. Scott Fitzgerald")) {
  console.log(`${author.name} (${author.birth_date} - ${author.death_date})`);
  console.log(`Works: ${author.work_count}`);
}

// Advanced search
const searchResults = client.searchAuthor({
  name: "F. Scott Fitzgerald",
  birth_date: { from: "1896-09-24", to: "1940-12-21" },
});
```

### Load Author's Works

Get all works by an author:

```typescript
const works = client.loadWorksByAuthorId("OL23919A");

for await (const work of works) {
  console.log(`${work.title} (${work.first_publish_year})`);
}
```

---

## Additional Features

### Load Work Ratings

Get community ratings for a work:

```typescript
const ratings = await client.loadRatingsByWorkId("OL45804W");

if (ratings) {
  console.log("Average:", ratings.average);
  console.log("Count:", ratings.count);
  console.log("Distribution:", ratings.distribution);
}
```

### Load Bookshelve Stats

Get reading statistics for a work:

```typescript
const stats = await client.loadBookshelveStatsByWorkId("OL45804W");

if (stats) {
  console.log("Want to read:", stats.want_to_read);
  console.log("Currently reading:", stats.currently_reading);
  console.log("Already read:", stats.already_read);
}
```

---

## Iteration and Pagination

### Asynchronous Iteration

All search methods return asynchronous iterators for efficient streaming:

```typescript
// Process results as they arrive
for await (const book of client.searchBook("science fiction")) {
  console.log(book.title);
  // Only loads the next page when needed
}

// Take only the first 10 results
let count = 0;
for await (const book of client.searchBook("science fiction")) {
  console.log(book.title);
  if (++count >= 10) break;
}
```

### Collect All Results

Convert the iterator to an array (loads all pages):

```typescript
const allBooks = await Array.fromAsync(client.searchBook("The Great Gatsby"));

console.log(`Found ${allBooks.length} results`);
```

### Manual Pagination

Control pagination manually if needed:

```typescript
// First page
const page1 = await Array.fromAsync(client.searchBook("javascript", { limit: 20, offset: 0 }));

// Second page
const page2 = await Array.fromAsync(client.searchBook("javascript", { limit: 20, offset: 20 }));
```

---

## Error Handling

### Missing Items

Methods that load single items return `null` if not found:

```typescript
const book = await client.loadEdition("OL12345678M");

if (book) {
  console.log(book.title);
} else {
  console.log("Book not found");
}
```

### Request Failures

The client throws errors on request failures:

```typescript
try {
  const book = await client.loadEdition("OL12345678M");
} catch (error) {
  if (error.cause instanceof Response) {
    const { status, statusText } = error.cause;
    const body = await error.cause.text();
    console.error("Failed to load book:", status, statusText, body);
  } else {
    console.error("An unexpected error occurred:", error);
  }
}
```

---

## Cover Images

### Cover URLs

The Open Library Covers API provides book cover images:

```typescript
// Get cover URL from a book
const book = await client.loadEdition("OL7353617M");

if (book.covers?.[0]) {
  const coverId = book.covers[0];
  const coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
  console.log("Cover:", coverUrl);
}

// Cover sizes: S (small), M (medium), L (large)
const smallCover = `https://covers.openlibrary.org/b/id/${coverId}-S.jpg`;
const mediumCover = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
const largeCover = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
```

### Cover by ISBN

Get cover directly by ISBN:

```typescript
const isbn = "9780141182636";
const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
```

---

## Rate Limiting and Best Practices

### Rate Limits

Open Library has the following rate limits:

- **Search API**: 100 requests per 5 minutes
- **Other APIs**: Throttled to prevent abuse

### Best Practices

1. **Provide Contact Info**: Always include your email in the client constructor

   ```typescript
   const client = new Client("your-email@example.com");
   ```

2. **Cache Results**: Store frequently accessed data locally

   ```typescript
   const cache = new Map();
   const cacheKey = `work:${workId}`;

   if (cache.has(cacheKey)) {
     return cache.get(cacheKey);
   }

   const work = await client.loadWork(workId);
   cache.set(cacheKey, work);
   ```

3. **Use Specific Fields**: Request only needed fields to reduce bandwidth

   ```typescript
   client.searchBook("query", {
     fields: ["title", "author_name", "isbn"], // Only what you need
   });
   ```

4. **Handle Errors Gracefully**: Wrap API calls in try-catch blocks

5. **Respect Pagination**: Don't load all results if you only need a few

   ```typescript
   // Good: Take first 10
   let count = 0;
   for await (const book of client.searchBook("query")) {
     if (++count > 10) break;
     // process book
   }

   // Bad: Load everything
   const allBooks = await Array.fromAsync(client.searchBook("query"));
   ```

---

## TypeScript Support

Full TypeScript definitions included:

```typescript
import type {
  SearchBookResult,
  Work,
  Edition,
  Author,
  SearchAuthorResult,
  BookQuery,
  AuthorQuery,
  SearchOptions,
} from "@colibri-hq/open-library-client";

// Type-safe queries
const query: BookQuery = {
  title: "The Great Gatsby",
  author: "Fitzgerald",
  publish_year: { from: 1920 },
};

// Type-safe results
const book: SearchBookResult | null = await client.searchBook(query).next();
```

---

## Complete Example

A comprehensive example showing common workflows:

```typescript
import { Client } from "@colibri-hq/open-library-client";

const client = new Client("your-email@example.com");

async function findBookAndAuthor(isbn: string) {
  // 1. Find edition by ISBN
  const edition = await client.loadEditionByIsbn(isbn);

  if (!edition) {
    console.log("Book not found");
    return;
  }

  console.log("Book:", edition.title);
  console.log("Publisher:", edition.publishers?.join(", "));
  console.log("Published:", edition.publish_date);

  // 2. Load the work
  const workKey = edition.works?.[0]?.key;
  if (workKey) {
    const workId = workKey.split("/").pop();
    const work = await client.loadWork(workId!);

    if (work) {
      console.log("\nWork details:");
      console.log("Description:", work.description);
      console.log("Subjects:", work.subjects?.slice(0, 5).join(", "));

      // 3. Load ratings
      const ratings = await client.loadRatingsByWorkId(workId!);
      if (ratings) {
        console.log("Rating:", ratings.average, "/", 5);
        console.log("Ratings:", ratings.count);
      }

      // 4. Load author
      const authorKey = work.authors?.[0]?.author.key;
      if (authorKey) {
        const authorId = authorKey.split("/").pop();
        const author = await client.loadAuthor(authorId!);

        if (author) {
          console.log("\nAuthor:", author.name);
          console.log("Born:", author.birth_date);
          console.log("Bio:", author.bio);

          // 5. Find other works by author
          console.log("\nOther works:");
          let count = 0;
          for await (const otherWork of client.loadWorksByAuthorId(authorId!)) {
            console.log(`- ${otherWork.title} (${otherWork.first_publish_year})`);
            if (++count >= 5) break;
          }
        }
      }
    }
  }

  // 6. Get cover image
  if (edition.covers?.[0]) {
    const coverUrl = `https://covers.openlibrary.org/b/id/${edition.covers[0]}-L.jpg`;
    console.log("\nCover:", coverUrl);
  }
}

// Run the example
findBookAndAuthor("9780141182636");
```

---

## Related Documentation

- [Metadata SDK](/packages/sdk/metadata) - Multi-provider metadata aggregation
- [Ingestion SDK](/packages/sdk/ingestion) - Complete ebook import pipeline
- [Open Library API Docs](https://openlibrary.org/developers/api) - Official API documentation
