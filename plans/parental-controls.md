# Parental Controls & Age Management

## Description

Comprehensive parental control system allowing parents to manage child accounts, including age-based content
restrictions, reading maturity offsets, content approval workflows, and account setting controls.

## Current Implementation Status

**Partially Implemented:**

- ✅ User roles (admin, adult, child, guest)
- ✅ `birthdate` field for age calculation
- ✅ `age_requirement` on collections
- ❌ No age offset/maturity adjustment
- ❌ No content approval workflow
- ❌ No parent-child account linking
- ❌ No parental settings override

## Implementation Plan

### Phase 1: Parent-Child Relationships

1. Create account relationship table:
   ```sql
   CREATE TABLE authentication.account_guardian (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     child_id UUID NOT NULL REFERENCES authentication.user(id),
     guardian_id UUID NOT NULL REFERENCES authentication.user(id),
     relationship VARCHAR(20), -- parent, guardian, teacher
     can_modify_settings BOOLEAN DEFAULT true,
     can_approve_content BOOLEAN DEFAULT true,
     created_at TIMESTAMPTZ DEFAULT now(),
     UNIQUE(child_id, guardian_id)
   );
   ```

### Phase 2: Age Offset System

1. Add maturity offset to user:
   ```sql
   ALTER TABLE authentication.user ADD COLUMN
     age_offset INTEGER DEFAULT 0 CHECK (age_offset BETWEEN -5 AND 5),
     age_offset_set_by UUID REFERENCES authentication.user(id);
   ```

2. Effective age calculation:
   ```typescript
   function getEffectiveAge(user: User): number {
     const actualAge = calculateAge(user.birthdate);
     return Math.max(0, actualAge + (user.age_offset ?? 0));
   }
   ```

3. Apply effective age to content access checks

### Phase 3: Content Approval Workflow

1. Create approval request table:
   ```sql
   CREATE TABLE content_approval (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     child_id UUID NOT NULL REFERENCES authentication.user(id),
     content_type VARCHAR(20) NOT NULL, -- work, collection
     content_id UUID NOT NULL,
     status VARCHAR(20) DEFAULT 'pending', -- pending, approved, denied
     requested_at TIMESTAMPTZ DEFAULT now(),
     reviewed_by UUID REFERENCES authentication.user(id),
     reviewed_at TIMESTAMPTZ,
     note TEXT
   );
   ```

2. Mark content as requiring approval:
   ```sql
   ALTER TABLE collection ADD COLUMN requires_approval BOOLEAN DEFAULT false;
   ALTER TABLE work ADD COLUMN requires_approval BOOLEAN DEFAULT false;
   ```

### Phase 4: Parental Settings Controls

1. Create controlled settings definition:
   ```typescript
   type ParentalControl = {
     canModifyProfile: boolean;
     canModifyPassword: boolean;
     canDownloadBooks: boolean;
     canAccessDiscover: boolean;
     maxDailyReadingTime?: number; // minutes
     allowedCollections?: string[]; // whitelist
     blockedCollections?: string[]; // blacklist
   };
   ```

2. Store as JSONB in user or separate table

### Phase 5: Dual Visibility System

1. Implement `visible_from_age` and `readable_from_age`:
   ```sql
   ALTER TABLE work ADD COLUMN
     visible_from_age SMALLINT,   -- Age to see in library
     readable_from_age SMALLINT;  -- Age to open/download
   ```

2. Display states:
    - Fully accessible: visible and readable
    - Visible but locked: shown grayed out, cannot read
    - Hidden: not shown at all

### Phase 6: UI Implementation

1. Parent dashboard for child management
2. Age offset controls with explanation
3. Content approval queue
4. Activity monitoring (optional)
5. Setting override interface

## Access Control Matrix

| Content State      | Child View | Child Action       |
|--------------------|------------|--------------------|
| No restrictions    | Full       | Read/Download      |
| Above visible age  | Hidden     | None               |
| Above readable age | Grayed     | View metadata only |
| Requires approval  | Badge      | Request access     |
| Approved           | Full       | Read/Download      |
| Denied             | Hidden     | None               |

## Open Questions

1. **Multiple Guardians**: Can multiple parents manage one child?
2. **Guardian Roles**: Different permission levels for guardians?
3. **Age Verification**: How to verify parent age/identity?
4. **Audit Log**: Track all parental control changes?
5. **Expiration**: Do content approvals expire?
6. **Bulk Operations**: Approve/deny multiple requests at once?
7. **Notification**: How to notify parents of pending requests?
8. **Reading Time**: Implement time limits, or defer to external tools?
9. **Privacy**: How much activity data should parents see?
