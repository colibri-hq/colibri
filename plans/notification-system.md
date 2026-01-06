# Notification System

## Description

Comprehensive notification infrastructure for alerting users about events via email, in-app notifications, and push
notifications. Currently only email is partially configured (Mailjet API key exists but no sending implementation).

## Current Implementation Status

**Partially Configured:**

- ✅ Mailjet API key in environment variables
- ✅ Email field on users

**Not Implemented:**

- ❌ No email sending implementation (`// TODO: Send confirmation mail`)
- ❌ No in-app notification system
- ❌ No push notification support
- ❌ No notification preferences
- ❌ No notification templates

## Implementation Plan

### Phase 1: Database Schema

1. Create notification tables:
   ```sql
   CREATE TYPE notification_channel AS ENUM ('email', 'push', 'in_app');
   CREATE TYPE notification_type AS ENUM (
     'comment_reply', 'comment_reaction', 'new_follower',
     'book_available', 'reading_reminder', 'system_alert',
     'invitation', 'approval_request', 'approval_response'
   );

   CREATE TABLE notification (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES authentication.user(id),
     type notification_type NOT NULL,
     title VARCHAR(255) NOT NULL,
     body TEXT,
     data JSONB,                    -- Type-specific payload
     read_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT now()
   );

   CREATE TABLE notification_preference (
     user_id UUID REFERENCES authentication.user(id),
     type notification_type NOT NULL,
     channel notification_channel NOT NULL,
     enabled BOOLEAN DEFAULT true,
     PRIMARY KEY (user_id, type, channel)
   );

   CREATE TABLE push_subscription (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES authentication.user(id),
     endpoint TEXT NOT NULL,
     keys JSONB NOT NULL,           -- p256dh, auth
     device_name VARCHAR(100),
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

### Phase 2: Email Service

1. Create email service (`packages/sdk/src/notifications/email.ts`):
   ```typescript
   export async function sendEmail(to, subject, template, data);
   export async function sendTransactional(type, to, data);
   ```

2. Email templates:
    - Welcome email
    - Password reset
    - Invitation
    - Comment reply
    - Reading reminder

3. Mailjet integration or alternative (Resend, Postmark)

### Phase 3: In-App Notifications

1. Create notification service:
   ```typescript
   export async function createNotification(userId, type, data);
   export async function markAsRead(notificationId);
   export async function markAllAsRead(userId);
   export async function getUnreadCount(userId);
   export async function loadNotifications(userId, options);
   ```

2. tRPC routes:
   ```typescript
   notifications.list({ page?, unreadOnly? })
   notifications.markRead({ id })
   notifications.markAllRead()
   notifications.unreadCount()
   notifications.preferences.get()
   notifications.preferences.set({ type, channel, enabled })
   ```

### Phase 4: Notification UI

1. Notification bell icon with unread count
2. Notification dropdown/panel
3. Notification list page
4. Individual notification cards
5. Mark as read on view

### Phase 5: Push Notifications

1. Service worker for push handling
2. Push subscription management
3. Web Push API integration
4. Push notification display

### Phase 6: Notification Preferences

1. Settings page for preferences
2. Per-type, per-channel toggles
3. Quiet hours configuration
4. Digest frequency (immediate, daily, weekly)

### Phase 7: Notification Triggers

1. Create notification on:
    - Comment reply
    - Comment reaction
    - Approval request/response
    - New book in followed series
    - Library loan due soon
    - System announcements

## Notification Types

| Type             | Email | Push | In-App |
|------------------|-------|------|--------|
| Comment reply    | ✅     | ✅    | ✅      |
| Invitation       | ✅     | ❌    | ✅      |
| Approval request | ✅     | ✅    | ✅      |
| Reading reminder | ✅     | ✅    | ✅      |
| System alert     | ✅     | ✅    | ✅      |

## Email Templates

```
templates/
├── welcome.html
├── invitation.html
├── password-reset.html
├── comment-reply.html
├── approval-request.html
└── reading-reminder.html
```

## Open Questions

1. **Provider**: Mailjet, Resend, Postmark, or self-hosted?
2. **Templates**: HTML email templates or plain text?
3. **Digest**: Support daily/weekly digest emails?
4. **Push**: Web Push only, or native app push too?
5. **Real-time**: SSE/WebSocket for instant in-app notifications?
6. **Retention**: How long to keep notification history?
7. **Batching**: Batch multiple notifications into one email?
8. **Unsubscribe**: One-click unsubscribe compliance?
