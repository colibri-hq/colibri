> **GitHub Issue:** [#147](https://github.com/colibri-hq/colibri/issues/147)

# OPDS Feed

## Description

Discovering the books in Colibri requires either a human operating a browser (well, an agent would also do, probably…),
or a device-specific integration.  
However, lots of apps and devices actually also have built-in OPDS support. So, by adding a feed of our own, we can make
it really easy to interface with external devices and services in a generic way.

Add an endpoint to Colibri that exposes an OPDS 1.2-compliant XML feed with all books and collections in the instance,
and also per-user feeds (probably nested under their public shelf links?) holding their individual books and
collections.

**If requested without credentials, only books and collections marked as public may be included.**  
If authenticated via any means supported by Colibri (Cookies, API Keys, OAuth), the feed must include everything visible
to that user in that scope; that will be all books and collections from themselves, and those of other users _not marked
as private_, or explicitly shared with them.

## Endpoints

Assuming we'll have user shelfs at `/~{{ userHandle }}`, two new endpoints should be added:

1. `/~/{{ userHandle }}/opds.xml`:  
   The feed document itself. If requested with an `Accept` header that doesn't prioritise `application/atom+xml` the
   highest, it should redirect to the documentation route described in 2. 2.`/~/{{ userHandle }}/opds`:  
   A documentation page that describes what OPDS is, how it can be used, how it can be used with Colibri (including the
   credential details outlined above), and links to the docs and the instance home.

## Settings

Users should be able to:

- disable OPDS feeds for the whole instance;
- disabled their personal OPDS feed;
- disable public OPDS feeds.

## Current Implementation Status

**Not Implemented:**

- ❌ No OPDS feed generation
- ❌ No Atom XML serialization
- ❌ No feed-specific authentication handling

**Existing Infrastructure:**

- ✅ Book and collection data models
- ✅ Visibility system planned (private/default/public)
- ✅ User handle system planned (`/~[handle]`)
- ✅ API key authentication exists
- ✅ OAuth infrastructure in place

## Implementation Plan

### Phase 1: OPDS Feed Generation

1. Create OPDS serialization utilities:

   ```typescript
   interface OpdsEntry {
     id: string;
     title: string;
     updated: Date;
     authors: Array<{ name: string; uri?: string }>;
     summary?: string;
     content?: string;
     links: Array<{
       rel: string;
       href: string;
       type: string;
       title?: string;
     }>;
     categories?: Array<{ term: string; label: string }>;
   }

   interface OpdsFeed {
     id: string;
     title: string;
     updated: Date;
     author: { name: string; uri?: string };
     links: OpdsLink[];
     entries: OpdsEntry[];
   }

   function serializeOpdsFeed(feed: OpdsFeed): string;
   ```

2. Implement OPDS 1.2 compliance:
   - Navigation feeds (catalog structure)
   - Acquisition feeds (book listings)
   - Search descriptors (OpenSearch)

3. Support required link relations:
   - `http://opds-spec.org/acquisition` (download)
   - `http://opds-spec.org/image` (cover)
   - `http://opds-spec.org/image/thumbnail` (thumbnail)
   - `alternate` (web view)

### Phase 2: Feed Routes

1. Create route group for OPDS endpoints:

   ```
   /~[handle]/opds.xml    → Main catalog feed
   /~[handle]/opds        → Documentation page
   /~[handle]/opds/new    → Recently added
   /~[handle]/opds/search → OpenSearch endpoint
   /~[handle]/opds/[collection] → Collection feed
   ```

2. Content negotiation middleware:

   ```typescript
   // If Accept header prefers text/html, redirect to docs
   // If Accept header prefers application/atom+xml, serve feed
   function negotiateOpdsContent(request: Request) {
     const accept = request.headers.get('Accept');
     if (prefersHtml(accept)) {
       return redirect('/~[handle]/opds');
     }
     return serveFeed();
   }
   ```

3. Implement pagination for large libraries:
   - Use `rel="next"` and `rel="previous"` links
   - Default page size: 50 entries

### Phase 3: Authentication Integration

1. Support multiple auth methods for feeds:

   ```typescript
   async function authenticateFeedRequest(request: Request) {
     // 1. Check for session cookie
     const session = await getSession(request);
     if (session) return { user: session.user, scope: 'full' };

     // 2. Check for API key in Authorization header
     const apiKey = extractApiKey(request);
     if (apiKey) {
       const key = await validateApiKey(apiKey);
       return { user: key.user, scope: key.scope };
     }

     // 3. Check for OAuth bearer token
     const token = extractBearerToken(request);
     if (token) {
       const auth = await validateOAuthToken(token);
       return { user: auth.user, scope: auth.scope };
     }

     // 4. Anonymous access (public books only)
     return { user: null, scope: 'public' };
   }
   ```

2. Filter feed entries based on auth scope and visibility

### Phase 4: Download Links

1. Generate acquisition links based on available formats:

   ```xml
   <link rel="http://opds-spec.org/acquisition"
         href="/~moritz/opds/download/[assetId]"
         type="application/epub+zip"
         title="EPUB"/>
   ```

2. Implement download endpoint with auth check:
   - Verify user has access to the book
   - Stream file from S3 storage
   - Set appropriate Content-Disposition header

3. Support indirect acquisition for protected content:
   - Return `http://opds-spec.org/acquisition/buy` or `sample` as appropriate

### Phase 5: Documentation Page

1. Create `/~[handle]/opds` documentation route:
   - Explain what OPDS is
   - How to add feed to common readers (Calibre, KOReader, Moon+ Reader)
   - Authentication options (API keys, OAuth)
   - Link to feed URL with copy button
   - Link to instance home

2. Include OpenSearch description document

### Phase 6: Settings UI

1. Instance settings (admin):
   - Toggle OPDS feeds globally
   - Toggle public OPDS access

2. User settings:
   - Toggle personal OPDS feed
   - Regenerate OPDS-specific API key

## Open Questions

1. **Feed Structure**: Flat list of all books, or hierarchical by collection?
2. **Search**: Implement OPDS search specification, or link to web search?
3. **Facets**: Support OPDS faceted search for filtering by author/genre/year?
4. **Streaming**: Support OPDS-PSE (Page Streaming Extension) for comics?
5. **Sync**: Support OPDS 2.0 for reading position sync?
6. **Rate Limiting**: Protect feed endpoints from excessive polling?
7. **Caching**: Cache feed XML with ETags, or generate on every request?
8. **Cover Quality**: Serve full covers or thumbnails in feed entries?
