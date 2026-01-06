---
title: Users Commands
description: CLI commands for managing user accounts
date: 2024-01-01
order: 6
tags: [cli, users, authentication, reference]
relevance: 65
---

# Users Commands

Manage user accounts and permissions in your Colibri instance.

> **Note**: Most user commands require administrator privileges.

## colibri users list

List all users on the instance.

```bash
colibri users list [options]
```

### Options

| Option     | Description                         |
|------------|-------------------------------------|
| `--role`   | Filter by role: admin, adult, child |
| `--active` | Show only active users              |
| `--json`   | Output as JSON                      |

### Examples

```bash
# List all users
colibri users list

# Show only admins
colibri users list --role admin

# Active users only
colibri users list --active

# Export as JSON
colibri users list --json > users.json
```

### Output

Displays:

- User ID
- Email
- Display name
- Role
- Account status
- Created date
- Last login

## colibri users create

Create a new user account.

```bash
colibri users create <email>
```

### Options

| Option          | Description                                     |
|-----------------|-------------------------------------------------|
| `--name`        | Display name                                    |
| `--role`        | User role: admin, adult, child (default: adult) |
| `--send-invite` | Send invitation email                           |

### Examples

```bash
# Create basic user
colibri users create user@example.com

# Create admin user
colibri users create admin@example.com --role admin --name "Admin User"

# Create and send invitation
colibri users create newuser@example.com --send-invite
```

### Notes

- User will need to set up a Passkey on first login
- If `--send-invite` is used, user receives an email with setup instructions

## colibri users invite

Send an invitation to a new user.

```bash
colibri users invite <email>
```

### Options

| Option      | Description                                        |
|-------------|----------------------------------------------------|
| `--role`    | Initial role (default: adult)                      |
| `--message` | Custom message to include                          |
| `--expires` | Invitation expiry in hours (default: 168 = 7 days) |

### Examples

```bash
# Send basic invitation
colibri users invite friend@example.com

# With custom message
colibri users invite friend@example.com \
  --message "Join my library!"

# Admin invitation
colibri users invite newadmin@example.com --role admin
```

## colibri users inspect

View details about a specific user.

```bash
colibri users inspect <user-id>
```

### Output

Displays:

- User information (email, name, role)
- Account status
- Registered Passkeys
- Statistics (books added, reviews written, etc.)
- Recent activity

### Examples

```bash
# View user details
colibri users inspect abc123

# JSON output
colibri users inspect abc123 --json
```

## colibri users edit

Update user information.

```bash
colibri users edit <user-id> [options]
```

### Options

| Option    | Description          |
|-----------|----------------------|
| `--email` | Update email address |
| `--name`  | Update display name  |
| `--role`  | Change role          |

### Examples

```bash
# Change user role
colibri users edit abc123 --role admin

# Update name
colibri users edit abc123 --name "John Doe"

# Update email
colibri users edit abc123 --email newemail@example.com
```

## colibri users disable

Disable a user account (temporary).

```bash
colibri users disable <user-id>
```

### Behavior

- User cannot log in
- Data is preserved
- Can be re-enabled later

### Options

| Option     | Description          |
|------------|----------------------|
| `--reason` | Reason for disabling |

### Examples

```bash
# Disable user
colibri users disable abc123

# With reason
colibri users disable abc123 --reason "Inactive for 6 months"
```

## colibri users enable

Re-enable a disabled user account.

```bash
colibri users enable <user-id>
```

### Examples

```bash
# Enable user
colibri users enable abc123
```

## colibri users delete

Permanently delete a user account.

```bash
colibri users delete <user-id>
```

### Behavior

By default:

- User account is deleted
- User's books are preserved (ownership transferred)
- User's reviews and comments are preserved (anonymized)
- User's collections are deleted

### Options

| Option                   | Description                                |
|--------------------------|--------------------------------------------|
| `--purge-content`        | Delete user's books, reviews, and comments |
| `--preserve-collections` | Keep collections (make them public)        |
| `--confirm`              | Skip confirmation prompt                   |

### Examples

```bash
# Delete user (interactive)
colibri users delete abc123

# Delete and purge all content
colibri users delete abc123 --purge-content --confirm

# Delete but preserve collections
colibri users delete abc123 --preserve-collections
```

## colibri users passkeys

Manage user Passkeys.

```bash
colibri users passkeys <user-id> [command]
```

### Subcommands

#### list

List all Passkeys for a user:

```bash
colibri users passkeys abc123 list
```

#### revoke

Revoke a specific Passkey:

```bash
colibri users passkeys abc123 revoke <passkey-id>
```

Useful for:

- Lost/stolen devices
- Security incidents
- Device replacement

### Examples

```bash
# List user's Passkeys
colibri users passkeys abc123 list

# Revoke a Passkey
colibri users passkeys abc123 revoke passkey-xyz
```

## colibri users reset-auth

Reset a user's authentication (remove all Passkeys).

```bash
colibri users reset-auth <user-id>
```

### Behavior

- Removes all Passkeys
- User must re-register on next login
- Send notification email to user

### When to Use

- User lost access to all devices
- Security incident
- Account takeover recovery

### Options

| Option     | Description                             |
|------------|-----------------------------------------|
| `--notify` | Send email notification (default: true) |

### Examples

```bash
# Reset authentication
colibri users reset-auth abc123

# Without notification
colibri users reset-auth abc123 --notify false
```

## colibri users stats

Show user statistics.

```bash
colibri users stats [user-id]
```

### Output

For specific user:

- Total books
- Reviews written
- Collections created
- Upload activity
- Login history

For all users (no user-id):

- Total users
- Active users (logged in last 30 days)
- Users by role
- Registration trend

### Examples

```bash
# Instance-wide stats
colibri users stats

# Specific user stats
colibri users stats abc123
```

## colibri users export

Export user data (GDPR compliance).

```bash
colibri users export <user-id>
```

### Output

Creates a ZIP file containing:

- User profile data
- Books uploaded
- Reviews and ratings
- Collections
- Reading history
- Comments

### Options

| Option     | Description                       |
|------------|-----------------------------------|
| `--format` | Format: json, csv (default: json) |
| `--output` | Output file path                  |

### Examples

```bash
# Export user data
colibri users export abc123 --output user-data.zip

# JSON format
colibri users export abc123 --format json
```

## colibri users import

Import users from CSV file.

```bash
colibri users import <csv-file>
```

### CSV Format

```csv
email,name,role
user1@example.com,User One,adult
admin@example.com,Admin User,admin
child@example.com,Child User,child
```

### Options

| Option           | Description              |
|------------------|--------------------------|
| `--send-invites` | Send invitation emails   |
| `--dry-run`      | Preview without creating |

### Examples

```bash
# Import users
colibri users import users.csv

# With invitations
colibri users import users.csv --send-invites

# Preview import
colibri users import users.csv --dry-run
```

## User Roles

### Role Permissions

| Permission         | Admin | Adult     | Child         |
|--------------------|-------|-----------|---------------|
| Upload books       | ✓     | ✓         | ✗             |
| Edit metadata      | ✓     | ✓         | ✗             |
| Delete books       | ✓     | Own books | ✗             |
| Manage users       | ✓     | ✗         | ✗             |
| Instance settings  | ✓     | ✗         | ✗             |
| Create collections | ✓     | ✓         | ✓             |
| Write reviews      | ✓     | ✓         | ✓ (moderated) |
| Download books     | ✓     | ✓         | ✓             |

### Changing Roles

```bash
# Promote to admin
colibri users edit abc123 --role admin

# Demote to adult
colibri users edit abc123 --role adult
```

## Workflows

### Onboarding New Users

```bash
# 1. Create user
colibri users create newuser@example.com --name "New User"

# 2. Send invitation
colibri users invite newuser@example.com

# 3. Verify account created
colibri users list | grep newuser
```

### Security Incident Response

```bash
# 1. Disable affected account
colibri users disable abc123 --reason "Security incident"

# 2. Reset authentication
colibri users reset-auth abc123

# 3. Review activity
colibri users inspect abc123

# 4. Re-enable once secure
colibri users enable abc123
```

### User Data Export (GDPR)

```bash
# Export all user data
colibri users export abc123 --output user-export.zip

# Send to user
# (implementation depends on your email setup)
```

### Bulk User Creation

```bash
# 1. Prepare CSV
cat > users.csv << EOF
email,name,role
user1@example.com,User One,adult
user2@example.com,User Two,adult
EOF

# 2. Import
colibri users import users.csv --send-invites

# 3. Verify
colibri users list
```

## Tips

### Find Inactive Users

```bash
# List users who haven't logged in recently
colibri users list --json | \
  jq '.[] | select(.last_login < "2024-01-01")'
```

### Audit Admin Users

```bash
# List all admins
colibri users list --role admin
```

### Monitor New Registrations

```bash
# Show users created in last 7 days
colibri users list --json | \
  jq '.[] | select(.created > "'$(date -d '7 days ago' -I)'")'
```
