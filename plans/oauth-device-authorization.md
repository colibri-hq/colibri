> **GitHub Issue:** [#168](https://github.com/colibri-hq/colibri/issues/168)

# OAuth Device Authorization Flow

## Description

The Device Authorization Flow (RFC 8628) enables OAuth on devices with limited input capabilities (smart TVs, gaming
consoles, printers, CLI tools) where typing credentials is impractical. Users authorize the device by entering a short
code on a separate device (phone/computer) with a full browser.

## Current Implementation Status

**Implemented:**

- ✅ Device authorization endpoint (`grantTypes/deviceCodeGrant.ts`)
- ✅ Device code and user code generation
- ✅ User verification page with consent UI
- ✅ Polling mechanism with `slow_down` handling
- ✅ Token issuance upon approval
- ✅ Code expiration handling
- ✅ Signed payloads for security (HMAC-SHA256)

**Routes Implemented:**

- ✅ `POST /auth/oauth/device` - Device authorization request
- ✅ `GET /auth/oauth/device` - User verification page
- ✅ `POST /auth/oauth/device` - User code submission and consent
- ✅ `POST /auth/oauth/token` - Token polling endpoint

**Partial Implementation:**

- ⚠️ Verification URI complete (exists but could be improved)
- ⚠️ Polling interval enforcement (basic implementation)

**Not Implemented:**

- ❌ QR code generation for verification_uri_complete
- ❌ Push notifications when device is approved
- ❌ Rate limiting per device code
- ❌ Device identification/naming
- ❌ Active device session management

## Flow Diagram

```
┌────────────┐                              ┌──────────────┐
│   Device   │                              │    Server    │
│ (Limited)  │                              │              │
└─────┬──────┘                              └──────┬───────┘
      │                                            │
      │ 1. Device Authorization Request            │
      │    (client_id, scope)                      │
      │ ──────────────────────────────────────────>│
      │                                            │
      │ 2. Device Authorization Response           │
      │    (device_code, user_code,                │
      │     verification_uri, interval)            │
      │ <──────────────────────────────────────────│
      │                                            │
      │         ┌──────────────┐                   │
      │         │     User     │                   │
      │         │  (Browser)   │                   │
      │         └──────┬───────┘                   │
      │                │                           │
      │ Display:       │ 3. Visit verification_uri │
      │ "Go to         │ ─────────────────────────>│
      │  example.com   │                           │
      │  Enter: WDJB"  │ 4. Enter user_code        │
      │                │ ─────────────────────────>│
      │                │                           │
      │                │ 5. Authenticate & Consent │
      │                │ <────────────────────────>│
      │                │                           │
      │ 6. Poll for Token                          │
      │    (device_code, grant_type)               │
      │ ──────────────────────────────────────────>│
      │                                            │
      │    (Repeat until approved/denied/expired)  │
      │                                            │
      │ 7. Token Response                          │
      │    (access_token, refresh_token)           │
      │ <──────────────────────────────────────────│
      │                                            │
```

## Implementation Plan

### Phase 1: QR Code Support

1. Generate QR code for `verification_uri_complete`:

   ```typescript
   interface DeviceAuthorizationResponse {
     device_code: string;
     user_code: string;
     verification_uri: string;
     verification_uri_complete?: string;
     verification_uri_qr?: string; // Base64 QR code image
     expires_in: number;
     interval: number;
   }
   ```

2. QR code generation options:
   - Server-side SVG generation (no external dependencies)
   - Client-side generation with library recommendation
   - Data URL format for easy embedding

### Phase 2: Enhanced Polling

1. Improved rate limiting:

   ```typescript
   interface DeviceCodeState {
     deviceCode: string;
     lastPollAt: Date;
     pollCount: number;
     currentInterval: number; // Increases on slow_down
   }
   ```

2. Exponential backoff on `slow_down`:
   - Initial interval: 5 seconds
   - After slow_down: interval × 2
   - Maximum interval: 60 seconds

3. Poll count limits:
   - Maximum polls before automatic expiration
   - Abuse detection

### Phase 3: Push Notifications

1. Optional webhook for device approval:

   ```typescript
   interface DeviceApprovalWebhook {
     device_code: string;
     user_id: string;
     approved: boolean;
     approved_at: string;
   }
   ```

2. Server-Sent Events (SSE) for real-time updates:

   ```typescript
   // Device can subscribe to approval events
   GET / auth / oauth / device / { device_code } / events;
   ```

3. WebSocket alternative for bidirectional communication

### Phase 4: Device Management

1. Device identification:

   ```typescript
   interface DeviceInfo {
     device_code: string;
     device_name?: string;
     device_type?: string;
     device_ip?: string;
     user_agent?: string;
     created_at: Date;
     approved_at?: Date;
     last_used_at?: Date;
   }
   ```

2. User device management UI:
   - List authorized devices
   - Revoke device access
   - View device activity

3. Device naming during authorization:
   - Allow users to name the device during consent
   - "Authorize 'Living Room TV'?"

### Phase 5: User Experience Improvements

1. Verification page enhancements:
   - Auto-focus on code input
   - Code format validation (show expected format)
   - Clear error messages
   - Mobile-optimized layout

2. Deep linking:
   - Mobile app deep links for verification
   - Universal links / App links

3. Accessibility:
   - Screen reader support
   - High contrast mode
   - Large text option for codes

### Phase 6: Security Enhancements

1. Device code binding:
   - Bind device code to client fingerprint
   - Detect device code theft attempts

2. Geographic validation:
   - Compare authorization location with device location
   - Warning for suspicious locations

3. Time-based restrictions:
   - Shorter expiration for high-security clients
   - Configurable per-client settings

## User Code Format

```typescript
// Current: Random alphanumeric
const userCode = 'WDJB-MJHT'; // 8 chars, hyphenated

// Configuration options
interface UserCodeConfig {
  length: number; // Default: 8
  alphabet: string; // Default: 'BCDFGHJKLMNPQRSTVWXZ' (no vowels)
  groupSize: number; // Default: 4
  separator: string; // Default: '-'
  caseSensitive: boolean; // Default: false
}
```

## Database Schema

```sql
-- Device challenges (existing, enhanced)
CREATE TABLE oauth_device_challenge (
  device_code VARCHAR(64) PRIMARY KEY,
  user_code VARCHAR(16) NOT NULL UNIQUE,
  client_id VARCHAR(255) NOT NULL,
  scopes TEXT[],

  -- Device info
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  device_ip INET,
  user_agent TEXT,

  -- State
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  approved BOOLEAN,
  approved_at TIMESTAMPTZ,
  approved_by VARCHAR(255),
  used_at TIMESTAMPTZ,

  -- Polling
  last_poll_at TIMESTAMPTZ,
  poll_count INTEGER DEFAULT 0,
  current_interval INTEGER DEFAULT 5,

  FOREIGN KEY (client_id) REFERENCES oauth_client(id),
  FOREIGN KEY (approved_by) REFERENCES authentication.user(id)
);

-- Device sessions (new)
CREATE TABLE oauth_device_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  device_code VARCHAR(64) NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  FOREIGN KEY (user_id) REFERENCES authentication.user(id),
  FOREIGN KEY (client_id) REFERENCES oauth_client(id)
);
```

## Configuration

```typescript
interface DeviceAuthorizationConfig {
  // Codes
  deviceCodeLength: number; // Default: 32 bytes
  userCodeLength: number; // Default: 8 characters
  userCodeAlphabet: string; // Default: consonants only
  userCodeGroupSize: number; // Default: 4

  // Timing
  codeTtl: number; // Default: 1800 (30 minutes)
  initialInterval: number; // Default: 5 seconds
  maxInterval: number; // Default: 60 seconds
  maxPolls: number; // Default: 360 (30 min @ 5s)

  // Features
  enableQrCode: boolean; // Default: true
  enablePushNotification: boolean; // Default: false
  enableDeviceNaming: boolean; // Default: true

  // Security
  bindToClientIp: boolean; // Default: false
  requireUserAuth: boolean; // Default: true
}
```

## Open Questions

1. **User Code Entropy**: Is 8 consonant characters sufficient entropy?
2. **Code Expiration**: 30 minutes too long? Too short?
3. **Polling Costs**: How to minimize server load from polling?
4. **Push vs Poll**: Should push notifications replace polling entirely?
5. **Device Types**: Predefined list or free-form?
6. **Multiple Approvals**: Can same user approve multiple devices simultaneously?
7. **Revocation UX**: How to make device revocation discoverable?
8. **Offline Devices**: Handle devices that go offline during authorization?
