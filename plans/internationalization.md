# Internationalization (i18n) with PO Files

## Description

Implement full internationalization support using PO/MO files (GNU gettext standard), enabling translation of the UI
into multiple languages. This is the industry standard for localization and has excellent tooling support.

## Current Implementation Status

**Not Implemented:**

- ❌ No i18n system
- ❌ No translations
- ❌ No locale detection
- ❌ All strings hardcoded in English

**Existing Infrastructure:**

- ✅ SvelteKit with SSR
- ✅ User preferences stored in database

## Implementation Plan

### Phase 1: i18n Library Selection

1. Evaluate options for SvelteKit:
    - **sveltekit-i18n** - Native SvelteKit integration
    - **typesafe-i18n** - Type-safe, compile-time
    - **svelte-i18n** - Popular, format-js based
    - **Paraglide** - Inlang ecosystem, tree-shakeable

2. PO file integration:
    - Use `@inlang/paraglide-js` with PO support
    - Or custom PO parser with chosen library

### Phase 2: Project Structure

1. Create locale files:
   ```
   locales/
   ├── en/
   │   └── messages.po
   ├── de/
   │   └── messages.po
   ├── fr/
   │   └── messages.po
   └── es/
       └── messages.po
   ```

2. Configure extraction tools

### Phase 3: String Extraction

1. Mark strings for translation:
   ```svelte
   <script>
     import { t } from '$lib/i18n';
   </script>

   <h1>{$t('library.title')}</h1>
   <p>{$t('library.bookCount', { count: books.length })}</p>
   ```

2. Extract strings to POT template:
   ```bash
   pnpm run i18n:extract
   # Generates locales/messages.pot
   ```

### Phase 4: Translation Workflow

1. Initialize new locale:
   ```bash
   pnpm run i18n:init de
   # Creates locales/de/messages.po
   ```

2. Translation tools:
    - Poedit (desktop)
    - Weblate (web-based, self-hosted)
    - Crowdin (cloud service)

3. Compile PO to JSON/JS:
   ```bash
   pnpm run i18n:compile
   ```

### Phase 5: Locale Detection & Switching

1. Detection order:
    - User preference (database)
    - Cookie
    - Accept-Language header
    - Default (English)

2. Locale switcher component
3. Persist preference to user profile

### Phase 6: Pluralization & Formatting

1. Plural rules per locale:
   ```
   msgid "book"
   msgid_plural "books"
   msgstr[0] "Buch"
   msgstr[1] "Bücher"
   ```

2. Date/time formatting
3. Number formatting
4. Currency (if needed)

### Phase 7: RTL Support

1. Detect RTL locales (Arabic, Hebrew)
2. CSS logical properties
3. Layout adjustments
4. Test with RTL content

### Phase 8: Content Translation

1. Book metadata (titles, descriptions) - Not translated
2. UI strings - Translated
3. System messages - Translated
4. Error messages - Translated

## Recommended Library: Paraglide

```typescript
// paraglide.config.js
export default {
  project: './project.inlang',
  outdir: './src/lib/paraglide',
  languages: ['en', 'de', 'fr', 'es'],
  sourceLanguageTag: 'en',
};
```

## PO File Format

```po
# English source
msgid "library.empty"
msgstr ""

# German translation (de/messages.po)
msgid "library.empty"
msgstr "Deine Bibliothek ist leer"

# With placeholders
msgid "library.bookCount"
msgstr "{count, plural, =0 {Keine Bücher} one {Ein Buch} other {# Bücher}}"
```

## Initial Locales

| Locale | Language | Priority              |
|--------|----------|-----------------------|
| en     | English  | Source                |
| de     | German   | High (project origin) |
| fr     | French   | Medium                |
| es     | Spanish  | Medium                |
| nl     | Dutch    | Low                   |
| it     | Italian  | Low                   |

## Open Questions

1. **Library Choice**: Which i18n library best fits SvelteKit?
2. **PO vs JSON**: Use PO files, or JSON with PO import?
3. **Compilation**: Build-time or runtime translation loading?
4. **Namespaces**: Single file or split by feature/route?
5. **Fallback**: Show English or translation key on missing?
6. **Contribution**: How to accept community translations?
7. **CI/CD**: Automated translation status checks?
8. **Coverage**: Minimum translation coverage to release locale?
