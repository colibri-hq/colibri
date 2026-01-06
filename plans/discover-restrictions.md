# Discover Restrictions for Children

## Description

Allow parents to restrict which books appear in the Discover section for child accounts. Parents can define a whitelist
of allowed books/collections, ensuring children only see curated content rather than the full library catalog.

## Current Implementation Status

**Not Implemented:**

- ❌ No Discover feature exists yet
- ❌ No per-user content restrictions
- ❌ No whitelist/blacklist system

**Existing Infrastructure:**

- ✅ User roles (child accounts exist)
- ✅ Age requirements on collections
- ✅ Collection access control

## Implementation Plan

### Phase 1: Discover Feature Foundation

1. Create Discover page/section:
    - Browse all accessible books
    - Filter by subject, author, age
    - Search within Discover

2. Understand what "Discover" shows:
    - Family shared library
    - External catalog previews
    - Recommendations

### Phase 2: Restriction System Schema

1. Create restriction configuration:
   ```sql
   CREATE TABLE discover_restriction (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES authentication.user(id),
     restriction_mode VARCHAR(20) NOT NULL, -- whitelist, blacklist, none
     set_by UUID REFERENCES authentication.user(id),
     set_at TIMESTAMPTZ DEFAULT now()
   );

   CREATE TABLE discover_allowed_content (
     restriction_id UUID REFERENCES discover_restriction(id),
     content_type VARCHAR(20) NOT NULL, -- work, collection, creator, subject
     content_id UUID NOT NULL,
     PRIMARY KEY (restriction_id, content_type, content_id)
   );
   ```

### Phase 3: Restriction Modes

1. **None**: Child sees age-appropriate content (default)
2. **Whitelist**: Child only sees explicitly allowed content
3. **Blacklist**: Child sees everything except blocked content

### Phase 4: Parent Configuration UI

1. Restriction mode selector per child
2. Add books/collections to allowed list
3. Quick actions: "Allow this author", "Allow this series"
4. Import from existing collection as whitelist

### Phase 5: Discover Filtering

1. Apply restrictions in queries:
   ```typescript
   function applyDiscoverRestrictions(query, userId) {
     const restriction = await getRestriction(userId);

     if (restriction.mode === 'whitelist') {
       return query.where('work.id', 'in', restriction.allowedIds);
     }
     if (restriction.mode === 'blacklist') {
       return query.where('work.id', 'not in', restriction.blockedIds);
     }
     return query; // No restriction
   }
   ```

2. Combine with age restrictions
3. Show "restricted" indicator to parents

### Phase 6: Request Access Flow

1. Child can request access to hidden content
2. Parent receives notification
3. One-click approve/deny
4. Optional: add to whitelist on approval

### Phase 7: Templates & Presets

1. Pre-configured restriction profiles:
    - "Picture Books Only"
    - "Chapter Books"
    - "School Library"
    - Custom

2. Share restriction profiles between families

## Restriction Modes Comparison

| Mode      | Shows               | Use Case                 |
|-----------|---------------------|--------------------------|
| None      | All age-appropriate | Older children           |
| Whitelist | Only allowed items  | Young children           |
| Blacklist | All except blocked  | Mature content filtering |

## Content Restriction Types

| Type       | Granularity   | Example                            |
|------------|---------------|------------------------------------|
| Work       | Single book   | Allow "Harry Potter"               |
| Collection | Group         | Allow "Bedtime Stories" collection |
| Creator    | All by author | Allow all Dr. Seuss                |
| Subject    | All with tag  | Allow all "Animals"                |
| Series     | Entire series | Allow "Magic Tree House"           |

## Open Questions

1. **Discover Definition**: What exactly does Discover show?
2. **Default Mode**: None or whitelist for new child accounts?
3. **Inheritance**: Can restrictions apply to collections automatically?
4. **Bypass**: Can children ever bypass restrictions (with code)?
5. **Notifications**: Alert parents when children browse restrictions?
6. **External Content**: How to restrict external catalog content?
7. **Age Transition**: Auto-relax restrictions as child ages?
8. **UI Feedback**: What does child see for restricted content?
