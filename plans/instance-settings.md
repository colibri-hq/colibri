> **GitHub Issue:** [#137](https://github.com/colibri-hq/colibri/issues/137)

# Instance Settings

## Description

Comprehensive configuration system for Colibri instances, allowing administrators to customize behavior, enable/disable
features, configure integrations, and set defaults for the entire installation.

## Current Implementation Status

**Partially Implemented:**

- ✅ `setting` table exists (`supabase/schema/17_settings.sql`)
- ✅ Key-value storage with JSONB values
- ✅ Basic settings retrieval in SDK
- ❌ No admin settings UI
- ❌ Limited settings actually used
- ❌ No settings validation
- ❌ No per-user defaults

## Implementation Plan

### Phase 1: Settings Schema Enhancement

1. Define settings categories:

   ```typescript
   type SettingCategory =
     | 'general'
     | 'security'
     | 'content'
     | 'metadata'
     | 'storage'
     | 'notifications'
     | 'integration';

   type SettingDefinition = {
     key: string;
     category: SettingCategory;
     type: 'boolean' | 'string' | 'number' | 'enum' | 'json';
     default: unknown;
     validation?: ZodSchema;
     adminOnly: boolean;
     description: string;
   };
   ```

2. Create settings registry in SDK

### Phase 2: Core Settings Implementation

```typescript
const instanceSettings = {
  // General
  'instance.name': string,
  'instance.description': string,
  'instance.logo_url': string,

  // Security
  'security.registration_enabled': boolean,
  'security.require_email_verification': boolean,
  'security.session_duration_hours': number,
  'security.max_failed_logins': number,

  // Content
  'content.public_bookshelf_enabled': boolean,
  'content.default_access_policy': 'personal' | 'shared' | 'public',
  'content.allow_public_downloads': boolean,

  // Metadata
  'metadata.auto_fetch_enabled': boolean,
  'metadata.provider_priority': string[],
  'metadata.cover_source_priority': string[],

  // Storage
  'storage.max_file_size_mb': number,
  'storage.allowed_formats': string[],

  // Notifications
  'notifications.email_enabled': boolean,
  'notifications.smtp_config': SMTPConfig,
};
```

### Phase 3: Admin Settings UI

1. Settings dashboard page (admin only)
2. Organized by category
3. Form validation
4. Immediate vs. save-all workflow
5. Reset to defaults option

### Phase 4: User Default Settings

1. Per-user preference overrides:

   ```sql
   CREATE TABLE user_preference (
     user_id UUID REFERENCES authentication.user(id),
     key VARCHAR(100),
     value JSONB,
     PRIMARY KEY (user_id, key)
   );
   ```

2. Cascade: User > Instance > Default

### Phase 5: Settings API

1. tRPC procedures:

   ```typescript
   settings.get(key);
   settings.getAll();
   settings.set(key, value); // admin
   settings.reset(key); // admin
   settings.getUserPreference(key);
   settings.setUserPreference(key, value);
   ```

2. SDK helper functions:
   ```typescript
   getEffectiveSetting(key, userId?)
   ```

### Phase 6: Feature Flags

1. Implement feature flag system
2. Gradual rollout support
3. A/B testing capability

## Settings Categories

| Category      | Examples                          |
| ------------- | --------------------------------- |
| General       | Instance name, branding, timezone |
| Security      | Registration, sessions, 2FA       |
| Content       | Visibility, age restrictions      |
| Metadata      | Providers, auto-fetch             |
| Storage       | Limits, formats, retention        |
| Notifications | Email, push, in-app               |
| Integration   | OAuth apps, catalogs, APIs        |

## Open Questions

1. **Storage Format**: Keep key-value, or use typed JSON document?
2. **Validation Timing**: Validate on save, or on use?
3. **Secrets**: How to store sensitive settings (SMTP password)?
4. **Audit Log**: Track who changed which settings?
5. **Export/Import**: Allow settings backup/restore?
6. **Multi-Tenant**: Support different settings per organization?
7. **Environment Override**: Allow env vars to override DB settings?
8. **Cache**: Cache settings in memory with invalidation?
