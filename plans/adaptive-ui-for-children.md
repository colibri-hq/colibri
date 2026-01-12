> **GitHub Issue:** [#113](https://github.com/colibri-hq/colibri/issues/113)

# Adaptive UI for Children

## Description

Automatically adjust the user interface based on the age of the logged-in child user. Younger children should see a
simpler, larger, and more colorful interface. As children grow older, the UI progressively becomes more
information-dense with subtler colors and smaller fonts, matching their developing reading and cognitive abilities.

## Current Implementation Status

**Partially Implemented:**

- ✅ User `birthdate` field exists in authentication schema
- ✅ User roles include `child` type
- ✅ Color scheme preference (system/light/dark) per user
- ✅ Tailwind CSS 4 with design tokens
- ❌ No age-based UI adaptation
- ❌ No UI complexity tiers
- ❌ No dynamic theming based on age

## Implementation Plan

### Phase 1: Define Age Tiers

1. Create age tier configuration:

   ```typescript
   type AgeTier = {
     minAge: number;
     maxAge: number;
     name: 'toddler' | 'early-reader' | 'child' | 'tween' | 'teen' | 'adult';
     uiConfig: UIConfig;
   };
   ```

2. Define UI configurations per tier:
   - **Toddler (3-5)**: Extra large touch targets, bright primary colors, minimal text, icon-heavy
   - **Early Reader (6-8)**: Large fonts, colorful but less saturated, simple navigation
   - **Child (9-11)**: Medium fonts, balanced colors, more information visible
   - **Tween (12-14)**: Standard fonts, subtle colors, full feature set
   - **Teen/Adult (15+)**: Full information density, professional aesthetic

### Phase 2: Theming System

1. Create CSS custom properties for each tier:

   ```css
   [data-age-tier='toddler'] {
     --font-size-base: 1.5rem;
     --spacing-base: 1.5rem;
     --color-primary: oklch(70% 0.25 150);
     --border-radius: 1.5rem;
   }
   ```

2. Implement Tailwind theme variants
3. Create age-tier Svelte context

### Phase 3: Component Adaptations

1. Create adaptive component variants:
   - Book cards (size, information shown)
   - Navigation (icons vs. text, complexity)
   - Forms (input sizes, labels)
   - Buttons (size, colors)

2. Conditional content display:
   - Hide complex metadata for younger tiers
   - Simplify synopses
   - Larger cover images

### Phase 4: Animation & Feedback

1. More playful animations for younger tiers
2. Sound effects (optional, for youngest)
3. Celebration animations (reading milestones)
4. Simplified loading states

### Phase 5: Testing & Accessibility

1. Test with actual children in each age group
2. Ensure accessibility compliance at all tiers
3. Parent override options

## CSS Variable Structure

```css
/* Base tier variables */
--tier-font-scale: 1;
--tier-spacing-scale: 1;
--tier-color-saturation: 0.15;
--tier-border-radius: 0.5rem;
--tier-animation-playfulness: 0;
--tier-information-density: 1;
```

## Open Questions

1. **Age Calculation**: Use exact birthdate or approximate (year only)?
2. **Override Options**: Can parents manually set a different tier?
3. **Transition**: Smooth transition when child ages into next tier, or instant?
4. **Birthday Awareness**: Special UI on the user's birthday? (Related: birthday-fireworks feature)
5. **A/B Testing**: How to validate which tier configurations work best?
6. **Performance**: Will multiple theme variants impact bundle size significantly?
7. **Consistency**: Should all family members see the same UI, or each their own?
8. **Accessibility**: How do age adaptations interact with accessibility settings?
