# @colibri-hq/open-library-client

A client for the Open Library API, providing a simple interface to access Open Library data. Works in both Node.js and
browser environments.

## Usage

Install the package:

```bash
npm install @colibri-hq/open-library-client
```

Import the client and create an instance [using your contact information](https://openlibrary.org/developers/api): This
is required to avoid getting blocked by the Open Library API for excessive requests.

```ts
import { Client } from "@colibri-hq/open-library-client";

const contactInfo = "myemail@example.com";
const client = new Client(contactInfo);
```

### Supported APIs

The client supports the following public endpoints:

- Book Search API
- Work & Edition API
- Authors API
- Author Search API
- Subjects API
- Covers API

### Iterating Over Results

All methods that return a list of items will return an asynchronous iterator that can be used to iterate over the
results, allowing you to process the full, paginated result set efficiently:

```ts
for await (const book of client.searchBook("The Great Gatsby")) {
  console.log(book.title);
}

// You can also use Array.fromAsync to collect all results into an array, although this foregoes the
// benefits of streaming results:
const authors = await Array.fromAsync(
  client.searchAuthor("F. Scott Fitzgerald"),
);
```

### Missing Items

All methods that return a single item will return the item directly, or `null` if not found:

```ts
const book = await client.loadBook("OL12345678M");

if (book) {
  console.log(book.title);
} else {
  console.error("Book not found");
}
```

### Error Handling

The client will throw an error if the request fails or if the response is not in the expected format. You can catch
these errors to handle them gracefully:

```ts
try {
  const book = await client.loadBook("OL12345678M");
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

## Reference

For additional details on the Open Library API, refer to
the [Open Library API documentation](https://openlibrary.org/developers/api).

### Searching for Books

You can search for books using the `searchBook` method. This method supports both simple string queries and more
advanced queries using a query builder. The results will be returned as an asynchronous iterator, allowing you to
process the results efficiently without loading everything into memory at once.

#### Simple Search

You can search for books with a simple string query:

```ts
const searchResults = await client.searchBook("The Great Gatsby");
```

#### Query Builder

For more advanced searches, you can also pass a query object:

```ts
const searchResults = await client.searchBook({
  title: "The Great Gatsby",
  publish_year: { from: 1920 },
  subject: ["American fiction", "Classics", ["Fiction", "Literature"]],
  "!author_key": "OL3415A",
});
```

The query builder supports all Open Library search fields, range queries, boolean operators, and exact string matches.
Refer to [the Open Library Search Tips](https://openlibrary.org/search/howto) for more details on constructing
search queries.

The following table shows examples of how to use the query builder:

| Expression                          | Query                                                                | SOLR Query                                                           |
| ----------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Single keyword                      | `{ title: "flammable" }`                                             | `title:flammable`                                                    |
| Exact match over multiple keywords  | `{ title_suggest: "vitamin a" }`                                     | `title:"vitamin a"`                                                  |
| Multiple keywords                   | `{ subject: ["tennis", "rules"] }`                                   | `subject:(tennis rules)`                                             |
| Numeric fields                      | `{ publish_year: 2015 }`                                             | `publish_year:2015`                                                  |
| Range query without end bracket     | `{ publish_year: { from: 2010 } }`                                   | `publish_year:[2010 TO *]`                                           |
| Range query                         | `{ publish_year: { from: 2010, to: 2020 } }`                         | `publish_year:[2010 TO 2020]`                                        |
| Range query without start bracket   | `{ publish_year: { to: 2020 } }`                                     | `publish_year:[* TO 2020]`                                           |
| Multiple keywords with OR construct | `{ subject: ["dogs", ["Juvenile fiction", "Juvenile literature"]] }` | `subject:dogs subject:("Juvenile fiction" OR "Juvenile literature")` |
| Negative query                      | `{ "!author_key": "OL3415A" }`                                       | `NOT author_key:OL3415A`                                             |
| Alphanumeric range query            | `{ lcc: { from: "B", to: "C" } }`                                    | `lcc:[B TO C]`                                                       |

The TypeScript types for the query builder will provide autocompletion and validation for the fields you can use.

#### Search Options

You can also provide additional options to the `searchBook` method to control the search behavior:

```ts
const searchResults = await client.searchBook("The Great Gatsby", {
  limit: 10, // Limit the number of results to 10
  offset: 500, // Skip the first 500 results
  sortBy: "new", // Sort results by newest first
  fields: ["title", "author_name", "publish_year"], // Fields to include in the results
  language: "en", // Re-rank results by language
});
```

| Parameter  | Description                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fields`   | The fields to get back from solr. The special value `*` may be provided to fetch all fields (however this will result in an expensive response, please use sparingly). To fetch availability data from archive.org, add the special value, `availability`.                                                                                                                                  |
| `sortBy`   | You can sort the results by various facets such as `new`, `old`, `random`, or `key` (which sorts as a string, not as the number stored in the string). For a complete list of sorts facets look [here](https://github.com/internetarchive/openlibrary/blob/master/openlibrary/plugins/worksearch/schemes/works.py#L142). The default is to sort by relevance.                               |
| `language` | The user's language as a two letter (ISO 639-1) language code. This influences but doesn't exclude search results. For example setting this to `fr` will _prefer_ the French edition of a given work, but will still _match_ works that don't have French editions. Adding `language: "fre"` on the other hand to the search query will _exclude_ results that don't have a French edition. |
| `offset`   | Offset for pagination.                                                                                                                                                                                                                                                                                                                                                                      |
| `limit`    | Limit the number of results.                                                                                                                                                                                                                                                                                                                                                                |

**Note:** The results will be paginated automatically, so you can iterate over them using the asynchronous iterator
returned by the `searchBook` method. The `limit` and `offset` parameters can be used to manually control the pagination,
but the client will handle this for you automatically if you just use the iterator.

If the book cannot be found, the method will return `null`.

### Loading a Work

You can load a work by its Open Library key:

```ts
const work = await client.loadWork("OL12345678W");
```

### Loading an Edition

You can load a specific edition by its Open Library key:

```ts
const book = await client.loadEdition("OL12345678M");
```

You can load an edition by its ISBN:

```ts
const book = await client.loadEditionByIsbn("9780141182636");
```

### Loading an Author

You can load an author by their Open Library key:

```ts
const author = await client.loadAuthor("OL12345678A");
```

### Searching for Authors

You can search for authors using the `searchAuthor` method, which supports both simple string queries and
advanced queries using a query builder.

#### Simple Search

You can search for authors with a simple string query:

```ts
const searchResults = await client.searchAuthor("F. Scott Fitzgerald");
```

#### Query Builder

You can also use the query builder for more advanced searches:

```ts
const searchResults = await client.searchAuthor({
  name: "F. Scott Fitzgerald",
  birth_date: { from: "1896-09-24", to: "1940-12-21" },
  death_date: { from: "1940-12-21" },
});
```

This works similarly to the book search, allowing you to filter authors by various fields such as name, birth date,
death date, and more. The results will be returned as an asynchronous iterator, allowing you to process the results
efficiently without loading everything into memory at once.

#### Search Options

You can also provide additional options to the `searchAuthor` method to control the search behavior:

```ts
const searchResults = await client.searchAuthor("F. Scott Fitzgerald", {
  limit: 10, // Limit the number of results to 10
  offset: 500, // Skip the first 500 results
  sortBy: "new", // Sort results by newest first
  fields: ["name", "birth_date", "death_date"], // Fields to include in the results
});
```

| Parameter | Description                                                                                                                                                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fields`  | The fields to get back from solr. The special value `*` may be provided to fetch all fields.                                                                                                                                                                                                                              |
| `sortBy`  | You can sort the results by various facets such as `new`, `old`, `random`, or `key` (which sorts as a string, not as the number stored in the string). For a complete list of sorts facets look [here](https://github.com/internetarchive/openlibrary/blob/master/openlibrary/plugins/worksearch/schemes/authors.py#L27). |
| `limit`   | Limit the number of results.                                                                                                                                                                                                                                                                                              |
| `offset`  | Offset for pagination.                                                                                                                                                                                                                                                                                                    |

### Loading an Author's Works

You can load an author's works by their Open Library key:

```ts
const works = await client.loadWorksByAuthorId("OL12345678A");
```

### Loading a Work's Editions

You can load all editions of a work by its Open Library key:

```ts
const editions = await client.loadEditionsByWorkId("OL12345678W");
```

### Loading ratings for a Work

You can load ratings for a work by its Open Library key:

```ts
const ratings = await client.loadRatingsByWorkId("OL12345678W");
```

### Loading bookshelve stats for a Work

You can load bookshelve stats for a work by its Open Library key:

```ts
const bookshelveStats = await client.loadBookshelveStatsByWorkId("OL12345678W");
```

This provides you with the number of users who have added the work to their bookshelves, as well as the number of users
who are currently reading or have already read the work.
