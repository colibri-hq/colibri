# Media Server (OPDS & DLNA)

## Description

Expose Colibri as a media server with industry-standard protocols, allowing users to access their library from
e-readers (via OPDS), media players (via DLNA/UPnP), and other compatible applications.

## Current Implementation Status

**Partially Implemented:**

- ✅ OPDS catalog support exists
- ✅ Catalog configuration table
- ✅ Feed generation basics
- ❌ No DLNA/UPnP server
- ❌ No audiobook streaming protocol
- ❌ Limited OPDS authentication

## Implementation Plan

### Phase 1: Enhanced OPDS Server

1. Complete OPDS 1.2 implementation:
    - Navigation feeds
    - Acquisition feeds
    - Search feeds (OpenSearch)
    - Faceted navigation

2. OPDS 2.0 support:
    - JSON-based format
    - Better metadata
    - Publication manifests

3. Feed types:
    - `/opds` - Root catalog
    - `/opds/new` - Recently added
    - `/opds/popular` - Most read
    - `/opds/authors` - Browse by author
    - `/opds/series` - Browse by series
    - `/opds/search` - Search endpoint

### Phase 2: OPDS Authentication

1. Basic Auth with API keys
2. OAuth bearer token support
3. Per-user feed filtering
4. Respect access controls

### Phase 3: DLNA/UPnP Server

1. Implement UPnP device description
2. Content Directory Service (CDS):
    - Browse/search media
    - Return metadata
    - Provide streaming URLs

3. Audio streaming for audiobooks:
    - Support range requests
    - DLNA-compliant transcoding (optional)

### Phase 4: Protocol Selection

1. Auto-discovery:
    - SSDP for DLNA
    - DNS-SD for OPDS

2. Configuration options:
    - Enable/disable each protocol
    - Port configuration
    - Network interface binding

### Phase 5: E-Reader Compatibility

1. Test with popular devices:
    - Kindle (may need Calibre-style workarounds)
    - Kobo
    - PocketBook
    - Tolino

2. Device-specific quirks handling

### Phase 6: Chromecast/AirPlay

1. Cast audiobooks to speakers
2. Integration with web player
3. Remote control from app

### Phase 7: API Documentation

1. Document OPDS endpoints
2. Provide curl examples
3. List compatible apps

## OPDS Feed Structure

```
/opds
├── /new           # Recently added
├── /popular       # Most downloaded
├── /authors       # Browse authors
│   └── /{id}      # Author's books
├── /series        # Browse series
│   └── /{id}      # Series books
├── /collections   # User collections
│   └── /{id}      # Collection books
├── /search        # OpenSearch
└── /book/{id}     # Acquisition feed
```

## Protocol Comparison

| Feature    | OPDS            | DLNA/UPnP     |
|------------|-----------------|---------------|
| Ebooks     | ✅ Primary       | ❌             |
| Audiobooks | ⚠️ Limited      | ✅ Primary     |
| Discovery  | Manual URL      | Auto (SSDP)   |
| Auth       | Basic/OAuth     | None/Custom   |
| Clients    | E-readers, apps | Media players |

## Compatibility Matrix

| Device/App   | OPDS | DLNA |
|--------------|------|------|
| Kobo         | ✅    | ❌    |
| PocketBook   | ✅    | ❌    |
| Moon+ Reader | ✅    | ❌    |
| KOReader     | ✅    | ❌    |
| VLC          | ❌    | ✅    |
| Kodi         | ❌    | ✅    |
| Sonos        | ❌    | ✅    |

## Open Questions

1. **Hosting**: Same server as web app, or separate service?
2. **DLNA Library**: Use existing library (upnp-mediaserver) or custom?
3. **Transcoding**: Transcode audiobooks for compatibility?
4. **Kindle**: Worth the effort to support Kindle's limited OPDS?
5. **Local Only**: Should DLNA be local network only?
6. **Queue**: Download queue for slow e-readers?
7. **Thumbnails**: Serve optimized covers for device screens?
8. **Sync**: Sync reading position from OPDS clients?
