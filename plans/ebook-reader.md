# Ebook Reader Application

## Description

Full-featured in-browser ebook reader for EPUB, PDF, and potentially MOBI formats. This is the core reading experience
of the application, enabling users to read their books directly in Colibri.

## Current Implementation Status

**Partially Implemented:**

- ✅ EPUB parsing and extraction
- ✅ PDF.js integration
- ✅ MOBI parsing
- ✅ CFI (Canonical Fragment Identifier) support

**Not Complete:**

- ❌ No reader UI component
- ❌ No reader route/page
- ❌ No reading settings (font, theme)
- ❌ No table of contents navigation
- ❌ No pagination/scrolling modes
- ❌ No search within book

## Implementation Plan

### Phase 1: Reader Architecture

1. Design reader component structure:
   ```
   /read/[edition]
   ├── ReaderShell        # Layout container
   ├── ReaderToolbar      # Top navigation
   ├── ReaderContent      # Book content area
   │   ├── EpubRenderer   # EPUB-specific
   │   ├── PdfRenderer    # PDF-specific
   │   └── MobiRenderer   # MOBI-specific (via EPUB conversion?)
   ├── ReaderSidebar      # TOC, annotations
   └── ReaderSettings     # Reading preferences
   ```

### Phase 2: EPUB Reader

1. Integrate epub.js or build custom:
    - Chapter loading and caching
    - CFI-based navigation
    - Page simulation or scroll mode
    - Image and media handling

2. Rendering options:
    - Paginated (book-like)
    - Scrolling (continuous)
    - Responsive reflow

### Phase 3: PDF Reader

1. PDF.js integration:
    - Page rendering to canvas
    - Zoom controls
    - Page navigation
    - Text selection

### Phase 4: Reader Settings

1. Reading preferences:
   ```typescript
   type ReaderSettings = {
     theme: 'light' | 'sepia' | 'dark';
     fontFamily: string;
     fontSize: number;        // 12-32
     lineHeight: number;      // 1.2-2.0
     margins: 'narrow' | 'medium' | 'wide';
     textAlign: 'left' | 'justify';
     displayMode: 'paginated' | 'scroll';
   };
   ```

2. Settings persistence per user
3. Quick toggle controls

### Phase 5: Navigation

1. Table of contents sidebar
2. Page/location indicator
3. Go to page/location
4. Chapter navigation
5. Bookmarks list

### Phase 6: Reading Features

1. In-book search
2. Dictionary lookup (integration with external API)
3. Text selection with actions
4. Night mode / blue light filter

### Phase 7: Progress Integration

1. Auto-save reading position
2. Sync with reading-progress feature
3. Session tracking
4. "Jump to last position" on open

### Phase 8: Annotations Integration

1. Highlight text passages
2. Add margin notes
3. View annotations overlay
4. Annotation sidebar

### Phase 9: Mobile Optimization

1. Touch gestures (swipe to turn)
2. Responsive layout
3. Full-screen mode
4. Orientation handling

## Reader Themes

```css
/* Light */
--reader-bg: #ffffff;
--reader-text: #333333;

/* Sepia */
--reader-bg: #f4ecd8;
--reader-text: #5b4636;

/* Dark */
--reader-bg: #1a1a1a;
--reader-text: #cccccc;
```

## Keyboard Shortcuts

| Key      | Action             |
|----------|--------------------|
| ← / →    | Previous/next page |
| Space    | Next page          |
| Home/End | First/last page    |
| T        | Toggle TOC         |
| S        | Search             |
| F        | Full screen        |
| Esc      | Exit reader        |

## Format Support

| Format | Renderer         | Features |
|--------|------------------|----------|
| EPUB 2 | Custom/epub.js   | Full     |
| EPUB 3 | Custom/epub.js   | Full     |
| PDF    | PDF.js           | Good     |
| MOBI   | Convert to EPUB? | Limited  |

## Open Questions

1. **Library**: Use epub.js, foliate-js, or build custom?
2. **MOBI**: Convert to EPUB on upload, or render separately?
3. **Offline**: Cache books for offline reading?
4. **DRM**: Any DRM support planned?
5. **Sync**: Real-time position sync across devices?
6. **Performance**: Handle very large books (1000+ pages)?
7. **Comics**: CBZ/CBR support for comics?
8. **Audio**: Synchronized audio playback for enhanced ebooks?
