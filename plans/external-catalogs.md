> **GitHub Issue:** [#130](https://github.com/colibri-hq/colibri/issues/130)

# External Catalog Integration

## Description

Enable integration with external book catalogs and stores, allowing users to browse and import books from sources like
Project Gutenberg, library systems (via OverDrive, etc.), and commercial stores. Different catalog types require
different authentication and have different capabilities.

## Current Implementation Status

**Partially Implemented:**

- ✅ OPDS catalog support exists (`supabase/schema/04_catalogs.sql`)
- ✅ Gutendex (Project Gutenberg) integration
- ✅ Catalog table with URL, credentials, enabled flag
- ✅ OPDS feed parsing
- ❌ No library system integration
- ❌ No store integration
- ❌ No per-user catalog credentials
- ❌ No child account restrictions

## Implementation Plan

### Phase 1: Catalog Type System

1. Define catalog types:

   ```sql
   CREATE TYPE catalog_type AS ENUM (
     'free',        -- Project Gutenberg, Standard Ebooks
     'authorized',  -- Library systems, OverDrive
     'store'        -- Amazon, Kobo, etc.
   );

   ALTER TABLE catalog ADD COLUMN
     catalog_type catalog_type NOT NULL DEFAULT 'free',
     requires_auth BOOLEAN DEFAULT false,
     auth_type VARCHAR(20), -- none, basic, oauth, api_key
     features JSONB; -- { download: true, borrow: true, purchase: false }
   ```

### Phase 2: Free Catalogs

1. Expand Project Gutenberg integration:
   - Browse by category/author
   - One-click add to library
   - Automatic format selection

2. Add Standard Ebooks support
3. Add Internet Archive support
4. Add ManyBooks support

### Phase 3: Authorized Catalogs (Libraries)

1. Library card authentication flow
2. OverDrive/Libby integration:
   - OAuth authentication
   - Browse available titles
   - Borrow books (temporary access)
   - Track loan status and due dates

3. Generic library catalog support (SIP2/NCIP)

### Phase 4: Store Catalogs

1. Amazon Kindle integration:
   - OAuth for account access
   - List purchased books
   - Download owned books

2. Other stores (Kobo, Google Play Books)
3. Purchase workflow (redirect to store)

### Phase 5: Catalog Discovery

1. OPDS catalog directory
2. Search for catalogs by name
3. Add custom catalog by URL
4. Catalog health monitoring

### Phase 6: Child Account Restrictions

1. Per-catalog child access settings:

   ```sql
   CREATE TABLE catalog_access (
     catalog_id UUID REFERENCES catalog(id),
     user_id UUID REFERENCES authentication.user(id),
     enabled BOOLEAN DEFAULT true,
     PRIMARY KEY (catalog_id, user_id)
   );
   ```

2. Parent approval for catalog access
3. Content filtering per catalog

### Phase 7: Plugin System

1. Define catalog provider interface:

   ```typescript
   interface CatalogProvider {
     id: string;
     name: string;
     type: CatalogType;
     authenticate(credentials): Promise<AuthToken>;
     search(query): Promise<CatalogEntry[]>;
     getDetails(id): Promise<CatalogEntry>;
     download(id): Promise<Blob>;
     borrow?(id): Promise<Loan>;
     purchase?(id): Promise<void>;
   }
   ```

2. Plugin discovery/installation mechanism
3. Third-party catalog support

## Catalog Types Comparison

| Type       | Auth         | Download | Ownership | Examples              |
| ---------- | ------------ | -------- | --------- | --------------------- |
| Free       | None         | Direct   | Permanent | Gutenberg, Std Ebooks |
| Authorized | Library Card | DRM      | Borrowed  | OverDrive, Hoopla     |
| Store      | Account      | DRM      | Purchased | Kindle, Kobo          |

## Open Questions

1. **DRM Handling**: How to handle DRM-protected downloads?
2. **Credential Storage**: Where to store library cards/OAuth tokens?
3. **Loan Management**: Track due dates and renewals?
4. **Plugin Distribution**: npm packages, or built-in registry?
5. **Legal Compliance**: Any legal issues with store integration?
6. **Anna's Archive**: Support as third-party plugin only?
7. **Offline Access**: Cache catalog browsing for offline?
8. **Sync**: Automatically add purchased/borrowed books?
