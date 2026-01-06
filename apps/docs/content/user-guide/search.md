---
title: Search
description: Finding books in your library
date: 2024-01-01
order: 7
tags: [search, discovery, filtering, guide]
relevance: 75
---

# Search

Colibri provides powerful search capabilities to help you find books in your library quickly.

## Basic Search

### Quick Search

The search bar in the top navigation allows you to search across your entire library:

1. Click the search icon or press `/` to focus the search bar
2. Type your search query
3. Results appear as you type
4. Click any result to navigate to that work

### What You Can Search

- **Titles**: Full titles and subtitles
- **Authors**: Creator names
- **Publishers**: Publisher names
- **Descriptions**: Book descriptions and synopses
- **Series**: Series names
- **Tags**: Custom tags you've added
- **ISBNs**: ISBN-10 and ISBN-13

## Search Syntax

### Simple Queries

Just type what you're looking for:

```
pride and prejudice
```

Finds books with "pride" and "prejudice" in any field.

### Phrase Search

Use quotes for exact phrases:

```
"the lord of the rings"
```

Matches the exact phrase only.

### Field-Specific Search

Search within specific fields:

```
author:tolkien
title:"the hobbit"
publisher:penguin
isbn:9780141439518
tag:fantasy
series:"the lord of the rings"
```

### Combining Searches

Use multiple criteria:

```
author:asimov tag:science-fiction
```

Finds science fiction books by Asimov.

### Wildcard Search

Use `*` for partial matches:

```
harry*
```

Matches "Harry Potter", "Harry Dresden", etc.

## Advanced Filters

### Filter Panel

Click **Filters** to access advanced filtering options:

- **Authors**: Filter by specific creators
- **Publishers**: Filter by publishing house
- **Languages**: Filter by book language
- **Series**: Filter by series membership
- **Tags**: Filter by custom tags
- **Publication Year**: Filter by date range
- **Formats**: Filter by file format (EPUB, MOBI, PDF)

### Combining Filters

You can combine multiple filters:

1. Select an author
2. Add a language filter
3. Set a publication year range
4. Results update automatically

### Saving Searches

Create smart collections based on search criteria:

1. Perform a search or apply filters
2. Click **Save as Collection**
3. Give your collection a name
4. The collection will automatically update as you add matching books

## Search Results

### Result Display

Search results show:

- Cover thumbnail
- Title and subtitle
- Author(s)
- Publication year
- Match relevance score

### Sorting Results

Sort results by:

- **Relevance** (default): Best matches first
- **Title**: Alphabetical by title
- **Author**: Alphabetical by author
- **Date Added**: Newest additions first
- **Publication Date**: Newest publications first

### Result Actions

From search results, you can:

- Click to view the full work page
- Add to collections (hover and click the icon)
- Download the book
- Quick preview metadata

## Keyboard Shortcuts

| Shortcut        | Action                                 |
| --------------- | -------------------------------------- |
| `/`             | Focus search bar                       |
| `Esc`           | Clear search                           |
| `↓` / `↑`       | Navigate results                       |
| `Enter`         | Open selected result                   |
| `⌘K` / `Ctrl+K` | Open command palette (includes search) |

## Search Tips

### Finding Exact Books

If you know the ISBN, use it for the most accurate results:

```
isbn:9780141439518
```

### Browsing by Author

To see all books by an author:

```
author:"J.R.R. Tolkien"
```

Or click the author's name on any book page.

### Finding Series Books

To find all books in a series:

```
series:"Harry Potter"
```

Or navigate to the series page from any book in the series.

### Discovering Tagged Books

Find books by custom tags:

```
tag:to-read
tag:favorites
```

### Language-Specific Searches

Find books in a specific language:

```
language:spanish
language:japanese
```

## Full-Text Search

### When Available

If full-text indexing is enabled (instance setting), you can search within book contents:

```
content:"to be or not to be"
```

This searches the actual text of your ebooks.

### Enabling Full-Text Search

Full-text search requires administrator configuration. Contact your instance admin to enable it.

## Search Performance

### Indexing

Colibri uses PostgreSQL's full-text search with automatic indexing:

- New books are indexed immediately
- Metadata changes update the index automatically
- Index is optimized for fast searches

### Large Libraries

For libraries with 10,000+ books:

- Consider narrowing searches with filters first
- Use field-specific searches when possible
- Results are paginated for better performance

## Search Privacy

### What's Tracked

- Search queries are NOT logged by default
- Instance administrators can enable search analytics
- Check your instance privacy policy for details

### Search Suggestions

If enabled, search suggestions are generated from:

- Your library content only
- Not from external sources
- Not shared with other users

## Troubleshooting

### No results found

**Possible causes**:

- Misspelled search terms
- Book isn't in your library
- Searching the wrong field

**Solutions**:

- Try a broader search
- Check spelling
- Remove field prefixes to search all fields

### Slow searches

**Possible causes**:

- Very large library
- Complex query
- Database needs optimization

**Solutions**:

- Use filters to narrow results
- Simplify your search query
- Contact administrator about database maintenance

### Missing expected results

**Possible causes**:

- Book metadata doesn't match your query
- Filters are too restrictive

**Solutions**:

- Check the book's metadata
- Remove some filters
- Try alternative search terms
