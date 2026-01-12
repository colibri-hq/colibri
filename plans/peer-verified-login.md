> **GitHub Issue:** [#149](https://github.com/colibri-hq/colibri/issues/149)

# Peer-Verified Login

## Description

Allow users to log in by having another trusted user confirm their identity, rather than using traditional
authentication methods. This is particularly useful for family settings where children may not have their own email
addresses or devices capable of Passkey authentication.

## Current Implementation Status

**Not Implemented:**

- ❌ No peer verification flow
- ❌ No approval request system
- ❌ No trust relationships between users

**Related Existing Features:**

- ✅ User roles (admin, adult, child, guest) exist
- ✅ WebAuthn/Passkey authentication fully implemented
- ✅ Passcode table exists for passwordless codes

## Implementation Plan

### Phase 1: Database Schema

1. Create `login_approval_request` table:
   - `id` (uuid)
   - `requester_id` (user requesting login)
   - `approver_id` (user who can approve, nullable for any adult)
   - `status` (pending, approved, rejected, expired)
   - `device_info` (JSON with browser/device details)
   - `created_at`, `expires_at`
   - `approved_at`, `approved_by`

2. Create `trusted_approver` table (optional):
   - `user_id` (the user who can be approved)
   - `approver_id` (the trusted approver)
   - Define who can approve whom

### Phase 2: Backend API

1. tRPC endpoints:
   - `requestLoginApproval` - Child initiates login request
   - `getPendingApprovals` - Adult sees pending requests
   - `approveLogin` - Adult confirms identity
   - `rejectLogin` - Adult denies request

2. Token generation upon approval
3. Real-time notification to requesting device

### Phase 3: Frontend UI

1. "Request Login Approval" button on login page
2. Device/browser identification display
3. Approval dashboard for adults
4. Push notification or polling for approval status
5. QR code option for in-person approval

### Phase 4: Security

1. Time-limited approval windows (e.g., 5 minutes)
2. Rate limiting on approval requests
3. Audit logging of all approvals
4. Geographic/IP validation (optional)

## Open Questions

1. **Who Can Approve**: Only specific users (parents), or any adult on the instance?
2. **Approval Scope**: Does approval grant a full session, or a time-limited token?
3. **Trust Persistence**: Should approved devices be remembered for future logins?
4. **Offline Approval**: Can approval work if the approver is on a different network?
5. **Abuse Prevention**: How to prevent repeated spam requests?
6. **Notification Method**: Push notifications, email, or in-app only?
7. **Physical Presence**: Should we require QR code scanning for in-person verification?
