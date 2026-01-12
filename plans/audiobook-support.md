> **GitHub Issue:** [#117](https://github.com/colibri-hq/colibri/issues/117)

# Audiobook Support

## Description

Extend Colibri to support audiobooks as a format alongside ebooks. Audiobooks require different metadata (duration,
narrator), different playback (audio player vs. reader), and different storage considerations (larger files, streaming).

## Current Implementation Status

**Not Implemented:**

- ❌ No audio format support
- ❌ No audio player
- ❌ No audiobook-specific metadata
- ❌ No streaming infrastructure

**Existing Infrastructure:**

- ✅ Work/Edition model (audiobook = edition type)
- ✅ Asset storage for files
- ✅ Contribution roles include "narrator" (nrt)
- ✅ S3 storage with pre-signed URLs

## Implementation Plan

### Phase 1: Edition Type Extension

1. Add edition format enum:

   ```sql
   CREATE TYPE edition_format AS ENUM (
     'ebook',
     'audiobook',
     'physical'  -- Future: physical book tracking
   );

   ALTER TABLE edition ADD COLUMN
     format edition_format DEFAULT 'ebook';
   ```

### Phase 2: Audiobook Metadata Schema

1. Extend edition metadata:

   ```sql
   ALTER TABLE edition ADD COLUMN
     duration_seconds INTEGER,      -- Total runtime
     chapter_count INTEGER,
     audio_codec VARCHAR(20),       -- mp3, aac, flac
     bitrate INTEGER,               -- kbps
     sample_rate INTEGER,           -- Hz
     channels SMALLINT;             -- 1=mono, 2=stereo
   ```

2. Chapter/track information:
   ```sql
   CREATE TABLE audiobook_chapter (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     edition_id UUID NOT NULL REFERENCES edition(id) ON DELETE CASCADE,
     position INTEGER NOT NULL,
     title VARCHAR(255),
     start_seconds INTEGER NOT NULL,
     duration_seconds INTEGER NOT NULL
   );
   ```

### Phase 3: Audio File Parsing

1. Support M4B format (primary):
   - Parse MP4 container
   - Extract chapter markers
   - Extract cover image
   - Read metadata atoms

2. Support MP3 with chapters:
   - ID3 tags
   - Chapter frames

3. Multi-file audiobooks:
   - One file per chapter
   - Folder structure detection

### Phase 4: Narrator Contributions

1. Ensure "narrator" role prominently displayed
2. Narrator search/browse
3. "Other audiobooks by this narrator"

### Phase 5: Audio Player

1. Web audio player component:
   - Play/pause, seek
   - Speed control (0.5x - 3x)
   - Sleep timer
   - Chapter navigation
   - Bookmark support

2. Responsive design for mobile

### Phase 6: Playback Progress

1. Track listening position:

   ```sql
   CREATE TABLE listening_progress (
     user_id UUID REFERENCES authentication.user(id),
     edition_id UUID REFERENCES edition(id),
     position_seconds INTEGER NOT NULL,
     speed DECIMAL(2,1) DEFAULT 1.0,
     updated_at TIMESTAMPTZ DEFAULT now(),
     PRIMARY KEY (user_id, edition_id)
   );
   ```

2. Cross-device sync
3. Resume from last position

### Phase 7: Streaming Optimization

1. Chunked streaming with range requests
2. Adaptive bitrate (optional)
3. Download for offline (progressive)
4. Buffer management

### Phase 8: Cover Art

1. Square cover support (audiobook standard)
2. Aspect ratio detection
3. Fallback from ebook cover

## Audiobook-Specific Metadata

| Field            | Type         | Description          |
| ---------------- | ------------ | -------------------- |
| duration_seconds | integer      | Total runtime        |
| narrator         | contribution | Narrator(s)          |
| audio_codec      | string       | mp3, aac, m4a        |
| bitrate          | integer      | Audio quality (kbps) |
| chapters         | array        | Chapter markers      |
| abridged         | boolean      | Abridged version     |

## Supported Formats

| Format    | Extension | Container | Chapters  |
| --------- | --------- | --------- | --------- |
| M4B       | .m4b      | MP4       | ✅ Native |
| M4A       | .m4a      | MP4       | ✅ Native |
| MP3       | .mp3      | None      | Partial   |
| FLAC      | .flac     | None      | Via cue   |
| Multi-MP3 | folder    | N/A       | By file   |

## Open Questions

1. **Storage**: Same S3 bucket, or separate for large audio files?
2. **Streaming vs. Download**: Default to stream, or offer download?
3. **Offline Support**: Service worker caching for offline playback?
4. **Multi-File**: How to handle audiobooks as multiple files?
5. **Transcoding**: Offer different quality levels?
6. **DRM**: How to handle DRM-protected audiobooks?
7. **Sync**: Sync position with Audible/other services?
8. **Combined Works**: Link audiobook and ebook editions together?
