# Asset Schema for Uploaded Book Files

## Description

Define a comprehensive schema for managing uploaded ebook files, supporting multiple formats per edition (EPUB, MOBI,
PDF, etc.) with associated metadata like file size, checksums, format information, and storage references.

## Current Implementation Status

**Partially Implemented:**

- ✅ `asset` table exists (`supabase/schema/02_assets.sql`)
- ✅ S3 storage with `storage_reference` (s3:// URI format)
- ✅ Fields: `id`, `edition_id`, `checksum`, `size`, `storage_reference`, timestamps
- ✅ Pre-signed URL generation for uploads/downloads
- ✅ OPFS-based upload worker in browser
- ❌ No format-specific metadata (codec, compression, etc.)
- ❌ No multiple format variants per edition
- ❌ No file processing pipeline metadata

## Implementation Plan

### Phase 1: Schema Enhancement

1. Add columns to `asset` table:
   ```sql
   ALTER TABLE asset ADD COLUMN
     format VARCHAR(20),           -- epub, mobi, pdf, azw3, etc.
     mime_type VARCHAR(100),
     metadata JSONB,               -- Format-specific metadata
     processing_status VARCHAR(20), -- pending, processing, ready, failed
     original_filename VARCHAR(255),
     uploaded_by UUID REFERENCES authentication.user(id);
   ```

2. Create `asset_metadata` JSON schema:
   ```typescript
   type AssetMetadata = {
     // Common
     pageCount?: number;

     // EPUB specific
     epubVersion?: '2.0' | '3.0' | '3.2';
     hasFixedLayout?: boolean;

     // PDF specific
     pdfVersion?: string;
     isScanned?: boolean;
     hasOcr?: boolean;

     // Audio (future)
     duration?: number;
     codec?: string;
     bitrate?: number;
   };
   ```

### Phase 2: Format Detection & Validation

1. Enhance file type detection on upload
2. Validate file integrity (magic bytes, structure)
3. Extract format-specific metadata during processing
4. Store processing errors for debugging

### Phase 3: Multiple Formats Per Edition

1. Support uploading multiple file formats for same edition
2. UI to manage format variants
3. User preference for download format
4. Automatic format selection based on device

### Phase 4: Processing Pipeline

1. Create asset processing queue:
    - Extract metadata
    - Generate cover if missing
    - Calculate checksum
    - Validate DRM status

2. Background job handling
3. Progress tracking and status updates

### Phase 5: Storage Optimization

1. Deduplication based on checksum
2. Storage tier management (hot/cold)
3. Bandwidth optimization for large files

## Format Support Matrix

| Format    | Extension | MIME Type                      | Metadata            |
|-----------|-----------|--------------------------------|---------------------|
| EPUB      | .epub     | application/epub+zip           | Version, layout     |
| MOBI      | .mobi     | application/x-mobipocket-ebook | Compression         |
| AZW3      | .azw3     | application/x-mobi8-ebook      | KF8 features        |
| PDF       | .pdf      | application/pdf                | Version, OCR status |
| CBZ       | .cbz      | application/vnd.comicbook+zip  | Page count          |
| Audiobook | .m4b      | audio/mp4                      | Duration, chapters  |

## Open Questions

1. **DRM Handling**: How to detect and handle DRM-protected files?
2. **Conversion**: Should we offer server-side format conversion?
3. **Deduplication**: Share assets across users if checksums match?
4. **Size Limits**: Maximum file size per format?
5. **Retention**: How long to keep failed/orphaned uploads?
6. **Versioning**: Support multiple versions of same format (e.g., updated EPUB)?
7. **CDN**: Use CDN for asset delivery, or direct S3?
