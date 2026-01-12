> **GitHub Issue:** [#112](https://github.com/colibri-hq/colibri/issues/112)

# Account Connections

## Description

Allow users to connect their accounts from other book-related platforms to sync data, import libraries, fetch metadata,
and aggregate ratings/reviews. Connected accounts can provide purchased books, reading history, reviews, ratings, and
cover images.

## Current Implementation Status

**Not Implemented:**

- ❌ No external account linking
- ❌ No OAuth client for external services
- ❌ No data import from connected accounts

**Existing Infrastructure:**

- ✅ OAuth server implementation (for Colibri as provider)
- ✅ Metadata providers (OpenLibrary, etc.) for data retrieval

## Implementation Plan

### Phase 1: Account Connection Framework

1. Create connected accounts table:

   ```sql
   CREATE TABLE authentication.connected_account (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES authentication.user(id),
     provider VARCHAR(50) NOT NULL, -- amazon, librarything, goodreads, etc.
     external_user_id VARCHAR(255),
     access_token TEXT, -- encrypted
     refresh_token TEXT, -- encrypted
     token_expires_at TIMESTAMPTZ,
     scopes TEXT[],
     profile_data JSONB,
     connected_at TIMESTAMPTZ DEFAULT now(),
     last_synced_at TIMESTAMPTZ,
     UNIQUE(user_id, provider)
   );
   ```

2. Token encryption at rest using Supabase Vault

### Phase 2: Provider Implementations

1. Define provider interface:

   ```typescript
   interface AccountProvider {
     id: string;
     name: string;
     icon: string;
     capabilities: ('books' | 'ratings' | 'reviews' | 'covers' | 'metadata')[];

     getAuthUrl(state): string;
     exchangeCode(code): Promise<Tokens>;
     refreshTokens(refreshToken): Promise<Tokens>;

     fetchBooks(tokens): Promise<Book[]>;
     fetchRatings(tokens): Promise<Rating[]>;
     fetchReviews(tokens): Promise<Review[]>;
   }
   ```

### Phase 3: Amazon Integration

1. Login with Amazon OAuth
2. Fetch Kindle library
3. Import purchased books
4. Download owned books (if possible)

### Phase 4: LibraryThing Integration

1. API key authentication
2. Import book collection
3. Sync ratings and reviews
4. Fetch cover images

### Phase 5: BookBrainz & Library of Congress

1. Link author/work identifiers
2. Authority record matching
3. Metadata enrichment

### Phase 6: Sync & Import UI

1. Account connection management page
2. One-click OAuth flow
3. Selective data import
4. Sync status and history
5. Disconnect with data retention options

### Phase 7: Data Aggregation

1. Merge imported data with existing
2. Conflict resolution for ratings
3. Review attribution
4. Cover image priority

## Supported Providers

| Provider            | Auth    | Capabilities                    |
| ------------------- | ------- | ------------------------------- |
| Amazon Kindle       | OAuth   | Books, Purchases                |
| LibraryThing        | API Key | Books, Ratings, Reviews, Covers |
| Goodreads           | OAuth   | Ratings, Reviews, Shelves       |
| BookBrainz          | API     | Metadata, IDs                   |
| Library of Congress | None    | Metadata, Authority             |
| Google Play Books   | OAuth   | Books, Purchases                |
| Kobo                | OAuth   | Books, Purchases                |

## Data Types Per Provider

| Provider     | Books | Ratings | Reviews | Covers | Metadata |
| ------------ | ----- | ------- | ------- | ------ | -------- |
| Amazon       | ✅    | ❌      | ❌      | ✅     | ✅       |
| LibraryThing | ✅    | ✅      | ✅      | ✅     | ✅       |
| Goodreads    | ❌    | ✅      | ✅      | ❌     | Limited  |
| Google Play  | ✅    | ❌      | ❌      | ✅     | ✅       |

## Open Questions

1. **API Access**: Do all these services have public APIs we can use?
2. **Rate Limits**: How to handle API rate limits for bulk imports?
3. **Goodreads**: API officially retired - any alternatives?
4. **Data Ownership**: Clear messaging about what data is imported?
5. **Two-Way Sync**: Push ratings back to connected services?
6. **Credential Security**: How to secure OAuth tokens at rest?
7. **Disconnection**: What happens to imported data on disconnect?
8. **Multiple Accounts**: Allow connecting multiple accounts per provider?
