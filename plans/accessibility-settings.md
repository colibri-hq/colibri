> **GitHub Issue:** [#111](https://github.com/colibri-hq/colibri/issues/111)

# Accessibility Settings

## Description

Allow users to configure accessibility preferences that map to browser/CSS media features. Users should be able to set
their preferences for reduced motion, high contrast, and other accessibility options independently of their system
settings.

## Current Implementation Status

**Partially Implemented:**

- ✅ `color_scheme` field exists (system, light, dark)
- ✅ User preferences stored in database
- ❌ No reduced motion preference
- ❌ No high contrast mode
- ❌ No additional accessibility settings
- ❌ No dynamic CSS property injection

## Implementation Plan

### Phase 1: Schema Updates

1. Add accessibility columns to user table:
   ```sql
   ALTER TABLE authentication.user ADD COLUMN
     reduced_motion VARCHAR(10) DEFAULT 'system', -- system, reduce, no-preference
     contrast_mode VARCHAR(10) DEFAULT 'system',  -- system, more, less, no-preference
     font_size_adjustment INTEGER DEFAULT 0,      -- -2 to +4 steps
     dyslexia_font BOOLEAN DEFAULT false,
     forced_colors VARCHAR(10) DEFAULT 'system';  -- system, active, none
   ```

### Phase 2: CSS Custom Properties

1. Create accessibility CSS layer:

   ```css
   :root[data-reduced-motion='reduce'] {
     --transition-duration: 0.01ms;
     --animation-duration: 0.01ms;
   }

   :root[data-contrast='more'] {
     --color-contrast-multiplier: 1.5;
     --border-width: 2px;
   }

   :root[data-font-size-adjust='2'] {
     --font-size-base: 1.25rem;
   }

   :root[data-dyslexia-font='true'] {
     --font-family-body: 'OpenDyslexic', sans-serif;
   }
   ```

2. Apply data attributes to document root based on preferences

### Phase 3: Settings UI

1. Create accessibility settings panel:
   - Motion preference toggle
   - Contrast mode selector
   - Font size slider
   - Dyslexia-friendly font toggle
   - Preview of changes

2. "Use system settings" option for each

### Phase 4: Component Updates

1. Audit all animations for reduced-motion compliance
2. Test high contrast mode across components
3. Ensure focus indicators are visible
4. Add skip links for keyboard navigation

### Phase 5: Reading View Accessibility

1. Font family options (serif, sans-serif, dyslexia)
2. Line height adjustment
3. Letter spacing control
4. Word spacing control
5. Text alignment options

### Phase 6: Testing & Compliance

1. WCAG 2.1 AA compliance audit
2. Screen reader testing (NVDA, VoiceOver)
3. Keyboard navigation testing
4. Color contrast verification

## Accessibility Preferences

| Setting       | Values                            | CSS Target             |
| ------------- | --------------------------------- | ---------------------- |
| Motion        | system, reduce, no-preference     | prefers-reduced-motion |
| Contrast      | system, more, less, no-preference | prefers-contrast       |
| Color Scheme  | system, light, dark               | prefers-color-scheme   |
| Font Size     | -2 to +4                          | font-size variables    |
| Dyslexia Font | on/off                            | font-family            |
| Forced Colors | system, active, none              | forced-colors          |

## Open Questions

1. **Persistence**: Store in database, localStorage, or both?
2. **Sync**: Should accessibility settings sync across devices?
3. **Inheritance**: Do parent settings apply to child accounts?
4. **Font Licensing**: Can we include OpenDyslexic or similar fonts?
5. **Screen Reader**: Any specific ARIA improvements needed?
6. **Testing**: How to automate accessibility testing?
7. **Compliance Level**: Target WCAG 2.1 AA or AAA?
8. **Documentation**: Should we provide accessibility documentation for users?
