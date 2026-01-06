---
title: Library Management
description: Managing your ebook library in Colibri
date: 2024-01-01
order: 1
tags: [library, ebooks, organization, guide]
relevance: 90
---

# Library Management

Learn how to navigate, organize, and manage your ebook library in Colibri.

## Viewing Your Library

### Works List

The main library view displays all works (books) in your collection. Each work represents the abstract concept of a book, which may have multiple editions and formats.

**View Options:**

- **Grid View**: Visual cards showing covers, titles, and authors
- **List View**: Compact table with detailed information
- **Toggle**: Switch between views using the view switcher in the toolbar

**Sorting Options:**

| Sort Option      | Description                      |
| ---------------- | -------------------------------- |
| Title (A-Z)      | Alphabetical by title            |
| Title (Z-A)      | Reverse alphabetical             |
| Author           | Alphabetical by author last name |
| Date Added       | Recently added first             |
| Publication Date | Newest publications first        |
| Recently Updated | Latest metadata changes          |

**Filtering:**

Click the filter button to narrow your library:

- **By Author**: Select one or more authors
- **By Publisher**: Filter to specific publishers
- **By Series**: Show only books in a series
- **By Tags**: Filter by subject, genre, or custom tags
- **By Language**: Limit to specific languages
- **By Collection**: Show only books in a collection
- **By Reading Status**: Not started, reading, finished

### Work Details

Click on any work to view its comprehensive detail page.

**Information Displayed:**

- **Cover image** with blurhash placeholder
- **Title and subtitle**
- **Authors and contributors** (with roles: author, editor, translator, etc.)
- **Publisher and publication date**
- **Synopsis/description**
- **Series information** with position
- **ISBN and other identifiers**
- **Language**
- **Subjects and tags**
- **Page count** (if available)
- **Available formats** (EPUB, MOBI, PDF)

**Actions:**

- **Download** - Get the ebook file in your preferred format
- **Edit** - Modify metadata
- **Add to Collection** - Organize into custom collections
- **Fetch Metadata** - Enrich with external data
- **Delete** - Remove from library (with confirmation)
- **Rate** - Give the book a star rating
- **Review** - Write a review
- **Comment** - Participate in discussions

---

## Editing Work Metadata

Manually edit metadata to correct errors or add missing information.

### Basic Information

1. Navigate to the work's detail page
2. Click the **Edit** button in the top-right
3. Edit any of the following fields:
   - **Title**: Main title of the work
   - **Subtitle**: Additional title information
   - **Synopsis**: Book description or summary
   - **Language**: ISO 639-1 language code (e.g., "en", "fr", "de")
   - **Publication Date**: When the work was first published

### Contributors

Add, edit, or remove contributors (authors, editors, etc.):

1. In the edit form, scroll to the **Contributors** section
2. Click **Add Contributor** to add a new person
3. For each contributor:
   - **Name**: Full name (will auto-suggest existing creators)
   - **Role**: Select from MARC roles:
     - `aut` - Author
     - `edt` - Editor
     - `trl` - Translator
     - `ill` - Illustrator
     - `aft` - Author of afterword
     - `aui` - Author of introduction
     - And many more
4. Reorder contributors by dragging
5. Remove a contributor with the delete button

**Name Matching:**

Colibri uses fuzzy matching to prevent duplicate creators. When you type a name, it suggests existing creators with similar names:

- "J.K. Rowling" matches "J. K. Rowling"
- "García Márquez, Gabriel" matches "Gabriel García Márquez"
- Handles initials, titles (Dr., Prof.), and suffixes (Jr., Sr.)

### Publisher

1. Type the publisher name in the **Publisher** field
2. Colibri auto-suggests existing publishers
3. Similar names are matched (e.g., "Penguin Books" and "Penguin" are considered the same)
4. Normalized to prevent duplicates:
   - "Penguin Books Ltd." → "Penguin"
   - "The Penguin Press" → "Penguin"

### Series

Add the work to a series:

1. In the **Series** section, enter the series name
2. Colibri auto-suggests existing series
3. Set the **Position** in the series (e.g., 1, 2, 3)
4. Series are fuzzy-matched to prevent duplicates:
   - "Harry Potter" matches "The Harry Potter Series"
   - "Wheel of Time" matches "The Wheel of Time"

### Identifiers

Manage ISBN and other identifiers:

1. In the **Identifiers** section, view existing identifiers
2. Click **Add Identifier** to add new ones
3. Select the identifier type:
   - **ISBN** - International Standard Book Number
   - **ISSN** - International Standard Serial Number
   - **DOI** - Digital Object Identifier
   - **ASIN** - Amazon Standard Identification Number
   - **OCLC** - Online Computer Library Center number
   - **LCCN** - Library of Congress Control Number
4. Enter the identifier value
5. Colibri validates ISBN format automatically

### Tags

Add subject headings and tags:

1. In the **Tags** section, view existing tags
2. Click **Add Tags** to add new ones
3. Type tag names separated by commas
4. Tags are automatically:
   - Converted to lowercase
   - Trimmed of whitespace
   - Deduplicated
5. BISAC subjects are parsed into individual tags:
   - "FICTION / Romance / Historical / Scottish"
   - Becomes: "fiction", "romance", "historical", "scottish"

### Save Changes

1. Click **Save** to apply your changes
2. Changes are validated before saving
3. Full-text search index is updated automatically
4. Metadata timestamp is updated

---

## Searching Your Library

### Quick Search

Use the search bar in the header for instant results:

```
Type: "gatsby" → Shows all works matching "gatsby"
```

**Searched Fields:**

- Title
- Author names
- Publisher
- Description
- Tags/subjects
- Series name
- ISBN

### Advanced Search

Click **Advanced Search** for detailed filtering:

**By Text:**

- **Title contains**: Match words in title
- **Author is**: Exact author match
- **Description contains**: Search within synopsis
- **ISBN is**: Exact ISBN match

**By Metadata:**

- **Language**: Filter to specific language
- **Publication year**: Range or exact year
- **Has series**: Only books in a series
- **Has cover**: Only books with cover images

**By Reading:**

- **Unread**: Books you haven't started
- **Reading**: Currently reading
- **Finished**: Completed books
- **Rated**: Books you've rated
- **Reviewed**: Books you've reviewed

**Combining Filters:**

All filters are combined with AND logic:

- Author = "Tolkien" AND Language = "en" AND Series = "The Lord of the Rings"

### Full-Text Search

Colibri uses PostgreSQL's full-text search for powerful queries:

**Search Operators:**

| Operator | Example                 | Meaning                                   |
| -------- | ----------------------- | ----------------------------------------- |
| AND      | `gatsby AND fitzgerald` | Both terms must appear                    |
| OR       | `gatsby OR zelda`       | Either term can appear                    |
| NOT      | `gatsby NOT movie`      | Exclude "movie"                           |
| Phrase   | `"great gatsby"`        | Exact phrase match                        |
| Prefix   | `fitz*`                 | Matches "fitzgerald", "fitzpatrick", etc. |

**Examples:**

```
"american fiction" AND classic
tolkien AND (hobbit OR "lord of the rings")
fantasy NOT romance
rowling* AND potter
```

---

## Downloading Books

### Single Book Download

1. Navigate to the work's detail page
2. Click the **Download** button
3. If multiple formats are available, select your preference:
   - **EPUB** - Best for most e-readers and apps
   - **MOBI** - For older Kindle devices
   - **PDF** - For fixed-layout books
4. The file downloads to your device

### Bulk Download

Download multiple books at once:

1. In the library view, enable multi-select mode
2. Check the boxes next to books you want
3. Click **Download Selected**
4. Choose format (if applicable)
5. Files are downloaded as a ZIP archive

**Download Options:**

- **Original filename**: Use the uploaded filename
- **Clean filename**: Format as "Author - Title.ext"
- **Include metadata**: Add metadata files (JSON, XML)

---

## Deleting Works

### Single Deletion

1. Navigate to the work's detail page
2. Click the **Delete** button
3. Review the confirmation dialog:
   - Shows all editions that will be deleted
   - Shows all files that will be removed
   - Shows collection memberships that will be removed
4. Click **Confirm Delete**

**Warning**: Deletion is permanent and cannot be undone. All associated data is removed:

- The work record
- All editions of the work
- All ebook files (assets)
- All comments and reviews
- All ratings
- Collection memberships
- Series memberships

### Bulk Deletion

Delete multiple books at once:

1. In the library view, enable multi-select mode
2. Check the boxes next to books to delete
3. Click **Delete Selected**
4. Review the confirmation showing all affected items
5. Click **Confirm Delete**

---

## Organizing Your Library

### Collections

Group books into custom collections:

- [See Collections Guide](/user-guide/collections) for full details

**Quick Actions:**

- Click the collection name in the sidebar to view it
- Right-click a collection for options (edit, delete, export)
- Drag books onto collection names to add them

### Series

View all books in a series:

1. Click a series name on any work detail page
2. View all works in the series, ordered by position
3. See missing volumes (gaps in numbering)
4. Add the series to your reading queue

### Tags and Subjects

Browse by tag:

1. Click **Browse Tags** in the sidebar
2. View tag cloud or list
3. Click a tag to see all works with that tag
4. Combine tags to narrow results

---

## Reading Lists and Progress

### Mark as Reading

1. On the work detail page, click **Currently Reading**
2. The work appears in your "Currently Reading" collection
3. Track your reading progress (coming soon)

### Mark as Finished

1. Click **Mark as Finished**
2. Optionally rate and review the book
3. The work appears in your "Read" collection
4. View your reading history

### Want to Read

1. Click **Want to Read** to add to your wishlist
2. Works appear in the "Want to Read" collection
3. Prioritize with drag-and-drop ordering

---

## Library Statistics

View insights about your library:

**Dashboard Widgets:**

- **Total Books**: Number of works in your library
- **Total Authors**: Unique creators
- **Total Pages**: Sum of all page counts
- **Languages**: Books by language
- **Publication Years**: Timeline of your collection
- **Reading Stats**: Books read this year
- **Top Authors**: Authors with the most books
- **Recent Additions**: Recently added books

**Export Options:**

- **CSV**: Spreadsheet format
- **JSON**: Machine-readable format
- **BibTeX**: For academic references
- **OPDS**: For e-reader apps

---

## Best Practices

### Keep Metadata Clean

- Use the **Fetch Metadata** button to update from external sources
- Review auto-imported metadata for accuracy
- Add missing information manually
- Fix typos and formatting errors

### Organize with Collections

- Create collections for different purposes:
  - Reading lists (e.g., "To Read 2024")
  - Genres (e.g., "Science Fiction")
  - Projects (e.g., "Research for Novel")
  - Recommendations (e.g., "Gifts for Friends")

### Use Tags Effectively

- Use consistent tag names
- Prefer lowercase for uniformity
- Use specific tags for better filtering:
  - Good: "epic fantasy", "urban fantasy", "sword and sorcery"
  - Less useful: "fantasy"

### Backup Your Library

- Regularly export your library metadata
- Keep copies of your ebook files
- Document custom collections and reading lists

---

## Troubleshooting

### Book Not Showing in Search

**Possible causes:**

- Recently added (search index updates every few minutes)
- Metadata missing searchable text
- Search term too specific

**Solutions:**

- Wait a few minutes and try again
- Search by ISBN or author instead
- Use Browse instead of Search

### Duplicate Books

**If you accidentally uploaded the same book twice:**

1. Find both entries in your library
2. Compare metadata and files
3. Keep the better version
4. Delete the duplicate
5. Use the duplicate detection feature during upload

### Missing Cover Images

**If a book has no cover:**

1. Edit the work
2. Click **Upload Cover**
3. Choose an image file (JPG, PNG, WEBP)
4. Cover is automatically resized and optimized
5. Or use **Fetch Metadata** to download from external sources

---

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

| Shortcut     | Action                 |
| ------------ | ---------------------- |
| `/`          | Focus search bar       |
| `n`          | New upload             |
| `e`          | Edit current work      |
| `d`          | Download current work  |
| `c`          | Add to collection      |
| `Escape`     | Close modal/dialog     |
| `←` `→`      | Navigate between works |
| `g` then `l` | Go to library          |
| `g` then `c` | Go to collections      |
| `g` then `s` | Go to settings         |

---

## Related Documentation

- [Uploading Books](/user-guide/uploading-books) - Import ebooks
- [Metadata Enrichment](/user-guide/metadata-enrichment) - Fetch external data
- [Collections](/user-guide/collections) - Organize with collections
- [Search](/user-guide/search) - Advanced search techniques
