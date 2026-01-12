> **GitHub Issue:** [#133](https://github.com/colibri-hq/colibri/issues/133)

# Identifier Management

## Description

Comprehensive system for managing book and creator identifiers across multiple platforms and standards. Support linking
editions to ISBNs, ASINs, and other identifiers, plus linking creators to authority records like VIAF, ISNI, and
platform-specific IDs.

## Current Implementation Status

**Partially Implemented:**

- ✅ Edition has `isbn` and `asin` columns
- ✅ Creator has `goodreads_id`, `amazon_id`, `openlibrary_id`
- ✅ Ebook parsing extracts identifiers
- ❌ No flexible identifier table for editions
- ❌ Limited creator identifier types
- ❌ No UI for viewing/linking to external platforms
- ❌ No identifier validation

## Implementation Plan

### Phase 1: Flexible Identifier Schema

1. Create identifier table for editions:

   ```sql
   CREATE TABLE edition_identifier (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     edition_id UUID NOT NULL REFERENCES edition(id) ON DELETE CASCADE,
     type VARCHAR(50) NOT NULL, -- isbn, isbn10, isbn13, asin, oclc, lccn, etc.
     value VARCHAR(255) NOT NULL,
     source VARCHAR(50), -- extracted, manual, provider:openlibrary
     verified BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT now(),
     UNIQUE(edition_id, type, value)
   );

   CREATE INDEX idx_edition_identifier_value ON edition_identifier(type, value);
   ```

2. Create identifier table for creators:
   ```sql
   CREATE TABLE creator_identifier (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     creator_id UUID NOT NULL REFERENCES creator(id) ON DELETE CASCADE,
     type VARCHAR(50) NOT NULL, -- viaf, isni, wikidata, goodreads, amazon, etc.
     value VARCHAR(255) NOT NULL,
     source VARCHAR(50),
     verified BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT now(),
     UNIQUE(creator_id, type, value)
   );
   ```

### Phase 2: Identifier Types

1. Edition identifiers:
   | Type | Format | Example |
   |------|--------|---------|
   | isbn13 | 13 digits | 9780141439518 |
   | isbn10 | 10 chars | 0141439513 |
   | asin | 10 alphanumeric | B00K0LE8NC |
   | oclc | numeric | 12345678 |
   | lccn | alphanumeric | 2001012345 |
   | doi | DOI format | 10.1000/xyz |
   | goodreads | numeric | 1234567 |
   | openlibrary | OL format | OL12345M |

2. Creator identifiers:
   | Type | Format | Source |
   |------|--------|--------|
   | viaf | numeric | VIAF |
   | isni | 16 digits | ISNI |
   | wikidata | Q + number | Wikidata |
   | goodreads | numeric | Goodreads |
   | amazon | alphanumeric | Amazon |
   | openlibrary | OL format | Open Library |
   | librarything | numeric | LibraryThing |

### Phase 3: Identifier Validation

1. ISBN checksum validation
2. ASIN format validation
3. ISNI checksum validation
4. URL format for DOI

### Phase 4: External Links UI

1. "This book on other platforms" section:
   - Show icons/logos for each platform
   - Link to external page
   - Copy identifier button

2. "This author elsewhere" section on creator pages

### Phase 5: URN Link Component

1. Create component for rendering URN links:

   ```svelte
   <IdentifierLink urn="urn:isbn:9780141439518" />
   <!-- Renders: ISBN logo + clickable link -->
   ```

2. Auto-detect and linkify identifiers in text

### Phase 6: Identifier Discovery

1. Look up missing identifiers from metadata providers
2. Cross-reference between providers
3. Suggest likely matches for manual verification

### Phase 7: Migration

1. Migrate existing `isbn`, `asin` columns to new table
2. Migrate creator IDs to new table
3. Keep original columns for backwards compatibility (or remove)

## External Platform Links

| Identifier  | URL Template                              |
| ----------- | ----------------------------------------- |
| isbn        | `https://openlibrary.org/isbn/{value}`    |
| asin        | `https://amazon.com/dp/{value}`           |
| goodreads   | `https://goodreads.com/book/show/{value}` |
| openlibrary | `https://openlibrary.org/works/{value}`   |
| wikidata    | `https://wikidata.org/wiki/{value}`       |
| viaf        | `https://viaf.org/viaf/{value}`           |
| isni        | `https://isni.org/isni/{value}`           |

## Open Questions

1. **Migration Strategy**: Remove old columns or keep both?
2. **Primary Identifier**: Is there a "canonical" identifier per edition?
3. **Verification**: What makes an identifier "verified"?
4. **Duplicates**: Handle same identifier on multiple editions?
5. **ISBN Variants**: Auto-convert between ISBN-10 and ISBN-13?
6. **Display Priority**: Which identifiers to show prominently?
7. **Search**: Search by any identifier type?
8. **API Exposure**: Expose identifiers in OPDS feeds?
