# Birthday Celebration Animation

## Description

Display a celebratory fireworks animation when a user logs in on their birthday. This adds a delightful personal touch
to the application, especially for children who would enjoy the surprise.

## Current Implementation Status

**Not Implemented:**

- ❌ No birthday detection logic
- ❌ No celebration animations
- ❌ No special event handling

**Existing Infrastructure:**

- ✅ User `birthdate` field exists in database
- ✅ Tailwind CSS with animation support
- ✅ Svelte 5 with transition capabilities

## Implementation Plan

### Phase 1: Birthday Detection

1. Create utility function to check if today is user's birthday:
   ```typescript
   function isBirthday(birthdate: Date): boolean {
     const today = new Date();
     return birthdate.getMonth() === today.getMonth()
         && birthdate.getDate() === today.getDate();
   }
   ```

2. Add birthday check to login/session initialization
3. Store "birthday celebrated this year" flag to avoid repeated animations

### Phase 2: Fireworks Animation

1. Evaluate animation approaches:
    - CSS-only animations
    - Canvas-based (tsParticles, fireworks-js)
    - Lottie animations
    - SVG animations

2. Implement fireworks component:
    - Multiple burst points
    - Colorful particle effects
    - Sound effects (optional, respecting user preferences)
    - Duration: 3-5 seconds

### Phase 3: Birthday Message

1. Personalized greeting modal/toast:
    - "Happy Birthday, [Name]! 🎂"
    - Age display (optional, if birthdate includes year)
    - Custom message based on age tier

2. Birthday badge/indicator in UI for the day

### Phase 4: Preferences

1. Allow users to disable birthday celebration
2. Respect reduced-motion accessibility setting
3. Parent control for child accounts

## Animation Options Comparison

| Option        | Pros                         | Cons                 |
|---------------|------------------------------|----------------------|
| CSS-only      | No dependencies, lightweight | Limited effects      |
| tsParticles   | Feature-rich, customizable   | Bundle size (~50KB)  |
| Lottie        | Designer-friendly, smooth    | Requires JSON assets |
| Canvas custom | Full control                 | Development time     |

## Open Questions

1. **Animation Library**: Which approach for the fireworks effect?
2. **Sound**: Include sound effects? How to handle muted preferences?
3. **Frequency**: Show once per day, once per session, or once per year?
4. **Fallback**: What if birthdate year is unknown (age display)?
5. **Time Zone**: Use user's local time or server time for birthday detection?
6. **Integration**: Should this tie into the adaptive-ui-for-children feature?
7. **Other Celebrations**: Extend to reading milestones, account anniversaries?
