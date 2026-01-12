> **GitHub Issue:** [#123](https://github.com/colibri-hq/colibri/issues/123)

# Custom Fields Support

## Description

Allow users to define custom metadata fields for editions, enabling storage of information not covered by the standard
schema. Similar to Calibre's custom columns feature, this provides flexibility for specialized collections (e.g.,
reading level, condition, purchase date, location).

## Current Implementation Status

**Not Implemented:**

- ❌ No custom field definitions
- ❌ No per-instance field configuration
- ❌ No custom field values storage

**Existing Infrastructure:**

- ✅ `metadata` JSONB column exists on `edition` table
- ✅ JSON validation constraint (`jsonb_typeof(metadata) = 'object'`)
- ✅ Settings table for instance configuration

## Implementation Plan

### Phase 1: Schema Design

1. Create custom field definitions table:

   ```sql
   CREATE TABLE custom_field (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(100) NOT NULL,
     slug VARCHAR(100) NOT NULL UNIQUE,
     field_type VARCHAR(20) NOT NULL, -- text, number, date, boolean, enum, rating
     description TEXT,
     options JSONB, -- For enum type: ["option1", "option2"]
     default_value JSONB,
     required BOOLEAN DEFAULT false,
     searchable BOOLEAN DEFAULT true,
     display_order INTEGER,
     created_by UUID REFERENCES authentication.user(id),
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

2. Store values in edition.metadata:
   ```typescript
   // edition.metadata structure
   {
     "custom_fields": {
       "reading_level": "advanced",
       "condition": 4,
       "purchase_date": "2024-01-15"
     }
   }
   ```

### Phase 2: Field Type System

1. Implement field types:

   ```typescript
   type FieldType =
     | { type: 'text'; maxLength?: number }
     | { type: 'number'; min?: number; max?: number; decimals?: number }
     | { type: 'date' }
     | { type: 'boolean' }
     | { type: 'enum'; options: string[] }
     | { type: 'rating'; max: number }
     | { type: 'url' }
     | { type: 'tags' }; // Multiple values
   ```

2. Validation functions per type
3. Display formatters

### Phase 3: Admin UI for Field Management

1. Custom field definition interface
2. Field type selection with configuration
3. Drag-and-drop ordering
4. Preview of field in context

### Phase 4: Edition UI Integration

1. Render custom fields in edition edit form
2. Display custom fields in edition detail view
3. Conditional display based on field presence
4. Bulk edit support for custom fields

### Phase 5: Search & Filtering

1. Index custom fields for search (if searchable)
2. Filter options in library view
3. Sort by numeric/date custom fields

### Phase 6: Import/Export

1. Include custom fields in data export
2. Map Calibre custom columns during import
3. Custom field mapping UI for imports

## Field Type Examples

| Type    | Use Case                 | Storage    |
| ------- | ------------------------ | ---------- |
| text    | Notes, location          | string     |
| number  | Rating, price            | number     |
| date    | Purchase date, read date | ISO string |
| boolean | Read status, owned       | boolean    |
| enum    | Condition, format        | string     |
| rating  | Personal rating          | number     |
| tags    | Themes, moods            | string[]   |

## Open Questions

1. **Scope**: Instance-wide custom fields, or per-user definitions?
2. **Migration**: How to handle field deletion (keep data, delete data)?
3. **Validation**: Strict validation or allow any value?
4. **Permissions**: Who can create/modify custom field definitions?
5. **Limits**: Maximum number of custom fields per instance?
6. **API Access**: Expose custom fields via OPDS/API?
7. **Inheritance**: Can collections have their own custom fields?
8. **Templates**: Pre-defined field sets for common use cases?
