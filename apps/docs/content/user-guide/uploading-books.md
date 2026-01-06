---
title: Uploading Books
description: How to upload ebooks to your Colibri library
date: 2024-01-01
order: 2
tags: [upload, ebooks, epub, mobi, pdf, guide]
relevance: 85
---

# Uploading Books

Colibri supports uploading EPUB, MOBI, and PDF ebooks with automatic metadata extraction and enrichment from external sources.

## Supported Formats

Colibri can read and store the following ebook formats:

| Format | Extension                | Metadata Support | Cover Extraction | Features                                                                                                            |
| ------ | ------------------------ | ---------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| EPUB   | `.epub`                  | Full support     | Yes              | Best format, native support for all metadata fields including series, authors, publisher, description, and subjects |
| MOBI   | `.mobi`, `.azw`, `.azw3` | Full support     | Yes              | Full metadata including Amazon-specific fields, creator information, and cover images                               |
| PDF    | `.pdf`                   | Limited          | Sometimes        | Basic metadata (title, author, subject), cover extraction from first page                                           |

### Format Recommendations

- **EPUB**: Recommended for fiction and non-fiction. Best metadata support and smallest file sizes.
- **MOBI/AZW**: Good for Kindle books. Full metadata support but larger files.
- **PDF**: Suitable for technical books and documents, but limited metadata extraction.

## Upload Methods

### Single Upload

Upload one book at a time with immediate metadata review:

1. Click the **Upload** button in the sidebar (or press `Cmd+U` / `Ctrl+U`)
2. Drag and drop a file onto the upload area, or click **Browse** to select a file
3. Wait for the file to upload and metadata to be extracted (usually 2-5 seconds)
4. Review the extracted metadata:
   - Title
   - Authors/Contributors
   - Cover image
   - Publisher and publication date
   - Description/Synopsis
   - ISBN and other identifiers
   - Language
   - Series information (if available)
5. Edit any fields as needed
6. Click **Enrich Metadata** to fetch additional data from external sources (optional)
7. Click **Save** to add the book to your library

**When to use single upload:**

- You want to carefully review each book's metadata
- You're uploading rare or unusual books that may need manual metadata corrections
- You want to immediately add the book to specific collections

### Bulk Upload

Upload multiple books at once for faster library building:

1. Click the **Upload** button in the sidebar
2. Select multiple files at once:
   - **Drag and drop**: Select multiple files in your file explorer and drag them to the upload area
   - **File browser**: Hold `Cmd` (Mac) or `Ctrl` (Windows/Linux) while selecting multiple files
3. Files are added to the upload queue and processed automatically
4. Monitor progress in the **Queue Status Widget** (bottom-right corner):
   - Shows total files in queue
   - Current file being processed
   - Processing status (extracting, enriching, saving)
   - Any errors encountered
5. Each book is processed sequentially to avoid overwhelming the database
6. Review and edit metadata for each book as it completes processing
7. Click **Save** on each book to add it to your library

**Queue Processing:**

- Files are processed one at a time to ensure data integrity
- Average processing time: 5-10 seconds per book (depending on enrichment)
- Queue persists across page refreshes
- You can continue browsing while uploads process in the background

**When to use bulk upload:**

- You're importing an existing library
- You have many books with good embedded metadata
- You trust the automatic enrichment process

### Upload from CLI

Advanced users can upload books using the Colibri CLI:

```bash
# Upload a single book
colibri works add ./path/to/book.epub

# Upload all books in a directory
colibri works import ./path/to/books/
```

See the [CLI Documentation](/user-guide/cli/works) for more details.

## Automatic Metadata Extraction

When you upload a book, Colibri automatically extracts embedded metadata from the ebook file:

### Core Metadata

- **Title**: Main title and subtitle (if available)
- **Sort Title**: Automatically generated for proper alphabetical sorting (e.g., "Great Gatsby, The" for "The Great Gatsby")
- **Authors**: Creator names with roles (author, editor, translator, illustrator, etc.)
- **Publisher**: Publishing company name
- **Publication Date**: Original publication date or edition date
- **Language**: ISO 639-1 language code (e.g., "en" for English, "de" for German)

### Identifiers

- **ISBN**: ISBN-10 and/or ISBN-13 (automatically validated and normalized)
- **ASIN**: Amazon Standard Identification Number (for Kindle books)
- **DOI**: Digital Object Identifier (for academic publications)
- **LCCN**: Library of Congress Control Number

### Content Metadata

- **Description**: Book synopsis or summary
- **Subjects/Tags**: Categories, genres, and topics (automatically parsed from BISAC codes if present)
- **Series**: Series name and position/volume number
- **Page Count**: Number of pages (for EPUB and MOBI)

### Visual Elements

- **Cover Image**: Extracted from the ebook file and automatically generated thumbnails
- **Blurhash**: Low-resolution preview for fast loading

### Format-Specific Extraction

**EPUB:**

- Reads metadata from `content.opf` file
- Extracts Dublin Core metadata
- Parses Calibre metadata extensions
- Supports series information from meta tags

**MOBI:**

- Reads metadata from EXTH records
- Extracts Amazon-specific fields
- Supports creator information and contributor roles

**PDF:**

- Reads metadata from PDF Info dictionary
- Limited to basic fields (title, author, subject, keywords)
- Attempts to extract cover from first page

## Metadata Enrichment

After extracting embedded metadata, Colibri can automatically enrich it with data from external sources.

### What Gets Enriched?

Enrichment fills in missing fields and improves existing metadata:

- **Missing authors**: Find creator names from ISBN lookup
- **Missing publisher**: Discover publisher information
- **Missing description**: Add synopsis from book databases
- **Missing subjects**: Add genre tags and categories
- **Missing series**: Detect series relationships
- **Cover image**: Find higher-quality covers
- **Publication details**: Add precise publication dates
- **Identifiers**: Discover additional ISBNs and identifiers

### Enrichment Process

1. **Trigger enrichment**:
   - Automatically during upload (if enabled in settings)
   - Manually by clicking **Enrich Metadata** on the upload form
   - Later from the book detail page by clicking **Fetch Metadata**

2. **Provider selection**:
   - Colibri queries multiple metadata providers in parallel
   - Default providers: Open Library, WikiData, Library of Congress
   - Additional providers (requires API keys): Google Books, ISBNdb, Springer

3. **Data aggregation**:
   - Results from all providers are collected
   - Confidence scores are calculated for each field
   - Conflicts are detected and resolved automatically

4. **Preview and apply**:
   - Review suggested changes before applying
   - Each field shows the source and confidence score
   - Accept all changes, or selectively apply specific fields
   - Manually edit any values before saving

See [Metadata Enrichment](/user-guide/metadata-enrichment) for detailed information about the enrichment system.

### Enrichment Strategies

**Conservative (Default)**:

- Only fills in missing fields
- Does not overwrite existing metadata
- Best for books with good embedded metadata

**Aggressive**:

- Overwrites existing metadata with higher-confidence data
- Replaces all fields if external sources have better data
- Best for books with poor or missing metadata

**Merge**:

- Combines embedded and external metadata
- Keeps all unique subjects/tags
- Adds additional authors and identifiers
- Best for comprehensive metadata coverage

Configure enrichment strategy in **Settings > Instance > Metadata**.

## Duplicate Detection

Colibri automatically detects potential duplicates to prevent importing the same book multiple times.

### Detection Methods

**1. Exact File Match**

- Compares SHA-256 hash of the file content
- **Confidence**: 100% (identical file)
- **Action**: Skip upload by default, or prompt to replace

**2. ISBN Match**

- Compares ISBN-10 or ISBN-13 identifiers
- **Confidence**: 95%+ (same edition)
- **Action**: Add as new edition or prompt
- **Note**: Different formats (EPUB vs MOBI) of the same book will match

**3. Fuzzy Title and Author Match**

- Compares normalized titles and author names using Levenshtein distance
- Ignores case, punctuation, and common words (a, an, the)
- **Confidence**: 70-90% (depends on similarity)
- **Action**: Always prompts for review

### Duplicate Handling Options

When a duplicate is detected, you can:

1. **Skip Upload**
   - Discard the new file
   - Keep the existing book
   - No changes to your library

2. **Replace Existing**
   - Delete the old file
   - Upload the new file
   - Keep existing metadata (unless you choose to re-enrich)
   - Use when you have a better quality file

3. **Add as New Edition**
   - Keep both files
   - Link them as different editions of the same work
   - Useful for different formats (EPUB and PDF) or different editions (original and annotated)
   - Share metadata between editions

4. **Import Anyway**
   - Treat as a completely separate work
   - Useful for false positive matches
   - Creates a new work entry

### Duplicate Detection Settings

Configure detection sensitivity in **Settings > Instance > Library**:

- **Strict**: Only exact ISBN or file hash matches
- **Normal** (Default): ISBN matches and high-confidence title/author matches (85%+)
- **Relaxed**: Include lower-confidence fuzzy matches (70%+)
- **Off**: Disable duplicate detection entirely

## Queue Status Monitoring

The **Queue Status Widget** in the bottom-right corner shows real-time upload progress.

### Widget States

**Idle**

- No uploads in progress
- Widget is minimized or hidden

**Processing**

- Shows current file name and progress
- Displays processing stage:
  - **Uploading**: Transferring file to server
  - **Extracting**: Reading embedded metadata
  - **Enriching**: Querying external sources
  - **Saving**: Writing to database
- Progress bar shows completion percentage

**Error**

- Red indicator with error count
- Click to expand and see error details
- Options to retry failed uploads or skip them

### Queue Actions

- **Expand/Collapse**: Click widget to show/hide details
- **Pause**: Temporarily stop processing
- **Resume**: Continue processing after pause
- **Clear Queue**: Remove all pending uploads
- **Retry Failed**: Attempt to re-process failed uploads

### Queue Persistence

- Queue state is saved to browser storage
- Survives page refreshes and browser restarts
- Automatically resumes when you return to Colibri
- Queue is per-user (not shared across devices)

## Error Handling and Troubleshooting

### Common Upload Errors

**File Too Large**

- **Error**: "File exceeds maximum size limit"
- **Cause**: File is larger than 100 MB
- **Solution**: Use a file compression tool or split into smaller files
- **Note**: Administrators can adjust the limit in instance settings

**Unsupported Format**

- **Error**: "File type not supported"
- **Cause**: File is not a valid EPUB, MOBI, or PDF
- **Solution**: Convert the file to a supported format using Calibre or similar tools

**Corrupt File**

- **Error**: "Unable to read file" or "Invalid ebook format"
- **Cause**: File is damaged or incomplete
- **Solution**: Re-download the file or obtain a new copy

**Metadata Extraction Failed**

- **Error**: "Could not extract metadata"
- **Cause**: File has malformed metadata or uses an unusual format
- **Solution**: Upload will continue, but you'll need to enter metadata manually

**Enrichment Timeout**

- **Error**: "Metadata enrichment timed out"
- **Cause**: External providers are slow or unavailable
- **Solution**: Skip enrichment and add metadata manually, or retry later

**Storage Error**

- **Error**: "Failed to save file to storage"
- **Cause**: S3 storage is misconfigured or unreachable
- **Solution**: Contact your administrator to check storage settings

### Retry Logic

Colibri automatically retries transient errors:

- **Network errors**: 3 retries with exponential backoff
- **Server errors (5xx)**: 2 retries
- **Client errors (4xx)**: No retries (requires manual intervention)

### Getting Help

If you encounter persistent upload errors:

1. Check the browser console for detailed error messages (F12 → Console tab)
2. Try uploading a different file to isolate the issue
3. Verify your storage configuration in Settings
4. Contact your instance administrator
5. Report bugs at [https://github.com/colibri-hq/colibri/issues](https://github.com/colibri-hq/colibri/issues)

## Format Conversion Tips

### Converting to EPUB

If you have books in unsupported formats, convert them to EPUB:

**Using Calibre** (Recommended):

```bash
# Install Calibre
# Visit https://calibre-ebook.com/

# Convert single file
ebook-convert input.azw output.epub

# Convert with metadata
ebook-convert input.pdf output.epub --authors "Author Name" --title "Book Title"
```

**Using Pandoc** (for text-based formats):

```bash
# Install Pandoc
# Visit https://pandoc.org/

# Convert Markdown to EPUB
pandoc input.md -o output.epub --metadata title="Book Title"
```

### Preserving Metadata During Conversion

- Use Calibre's metadata editor before converting
- Export metadata from original file format
- Re-embed metadata after conversion
- Manually verify metadata after upload

## Best Practices

### Before Uploading

1. **Organize files**: Use consistent naming (e.g., "Author - Title.epub")
2. **Pre-clean metadata**: Use Calibre to fix obvious metadata errors
3. **Check for duplicates**: Search your library before uploading
4. **Verify file integrity**: Ensure files are not corrupt

### During Upload

1. **Use enrichment**: Let Colibri fill in missing metadata automatically
2. **Review carefully**: Check that automatic metadata is accurate
3. **Add to collections**: Organize books immediately during upload
4. **Tag appropriately**: Add custom tags for better discoverability

### After Upload

1. **Verify cover images**: Ensure covers loaded correctly
2. **Check series relationships**: Verify series order if applicable
3. **Add reviews**: Rate and review books you've read
4. **Share collections**: Make your curated lists public (if desired)

## Keyboard Shortcuts

Speed up your upload workflow with keyboard shortcuts:

- `Cmd/Ctrl + U`: Open upload modal
- `Cmd/Ctrl + V`: Paste files from clipboard (if supported by browser)
- `Cmd/Ctrl + Enter`: Save and add book to library
- `Escape`: Cancel upload and close modal

## Next Steps

After uploading your books:

- **[Organize with Collections](/user-guide/collections)**: Create custom reading lists
- **[Enrich Metadata](/user-guide/metadata-enrichment)**: Improve book information
- **[Rate and Review](/user-guide/reviews-ratings)**: Share your opinions
- **[Search Your Library](/user-guide/search)**: Find books in your library

## Related Documentation

- [Metadata Enrichment](/user-guide/metadata-enrichment)
- [Collections](/user-guide/collections)
- [Storage Configuration](/setup/storage)
- [CLI: Works Commands](/user-guide/cli/works)
