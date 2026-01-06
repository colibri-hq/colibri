# User Invitations

## Description

Enable existing users to invite new members to the Colibri instance via email, QR code, or special setup links. Support
different invitation flows for adults (email verification) and children (parent-assisted setup without email).

## Current Implementation Status

**Partially Implemented:**

- ✅ User creation exists
- ✅ Email field on users (optional)
- ✅ User roles support adults and children
- ✅ WebAuthn/Passkey authentication
- ❌ No invitation system
- ❌ No invite tokens
- ❌ No QR code generation
- ❌ No parent-assisted child setup

## Implementation Plan

### Phase 1: Invitation Schema

1. Create invitation table:
   ```sql
   CREATE TABLE authentication.invitation (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     token VARCHAR(64) UNIQUE NOT NULL,
     email VARCHAR(255),
     role user_role DEFAULT 'adult',
     invited_by UUID NOT NULL REFERENCES authentication.user(id),
     expires_at TIMESTAMPTZ NOT NULL,
     accepted_at TIMESTAMPTZ,
     accepted_by UUID REFERENCES authentication.user(id),
     metadata JSONB, -- { name_suggestion, relationship, etc. }
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

### Phase 2: Invitation Types

1. **Email Invitation**:
    - Send email with unique link
    - Recipient creates account
    - Email verification included

2. **QR Code Invitation**:
    - Generate QR code with invite URL
    - Scan to access signup
    - Useful for in-person invites

3. **Parent Setup Link**:
    - Parent receives setup URL
    - Parent creates child account
    - Sets up Passkey on child's device

### Phase 3: Invitation API

1. tRPC procedures:
   ```typescript
   invitations.create({
     email?: string;
     role: 'adult' | 'child';
     expiresInDays: number;
   })

   invitations.accept({
     token: string;
     name: string;
     email?: string;
   })

   invitations.list()
   invitations.revoke(invitationId)
   invitations.resend(invitationId)
   ```

### Phase 4: Email Delivery

1. Email template for invitations
2. SMTP configuration (instance settings)
3. Resend capability
4. Track delivery status

### Phase 5: QR Code Generation

1. Generate QR code client-side
2. Include invite URL with token
3. Expiration display
4. Print-friendly format

### Phase 6: Child Account Setup Flow

1. Parent initiates child invite
2. Receives setup link (not sent to child)
3. Parent opens link on child's device
4. Parent enters child's name
5. Sets up Passkey for child
6. Child can now log in with just their name + Passkey

### Phase 7: Admin Controls

1. Instance setting: who can invite
    - Admin only
    - Adults only
    - Anyone
2. Maximum active invitations per user
3. Default invitation expiration

## Invitation Flow: Adult

```
1. User A creates invitation → Token generated
2. Email sent to invitee (or QR shown)
3. Invitee clicks link → Signup page
4. Invitee enters name, email
5. Invitee sets up Passkey
6. Account created, invitation marked accepted
```

## Invitation Flow: Child

```
1. Parent creates child invitation → Token generated
2. Parent receives setup link
3. Parent opens link on child's device
4. Parent enters child's name, birthdate
5. Parent helps child set up Passkey
6. Child account created linked to parent
```

## Open Questions

1. **Permission Model**: Who can invite? Admin, adults, all?
2. **Quota**: Limit invitations per user?
3. **Expiration**: Default expiration time? Configurable?
4. **Email Optional**: Support email-less accounts fully?
5. **Pre-Population**: Pre-fill role, name from invitation?
6. **Family Link**: Auto-link child to inviting parent?
7. **Revocation**: Can invitations be revoked after sending?
8. **Duplicate Prevention**: Handle duplicate email invitations?
