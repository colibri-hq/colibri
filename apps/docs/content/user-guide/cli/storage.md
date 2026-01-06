---
title: Storage Commands
description: CLI commands for managing S3-compatible storage
date: 2024-01-01
order: 4
tags: [cli, storage, s3, reference]
relevance: 65
---

# Storage Commands

Manage your S3-compatible object storage directly from the command line. These commands provide low-level access to your storage bucket for troubleshooting, backup, and advanced operations.

## colibri storage connect

Connect to an S3-compatible storage provider and save credentials.

```bash
colibri storage connect [options]
```

### Options

| Option                | Short | Description                       | Required |
| --------------------- | ----- | --------------------------------- | -------- |
| `--endpoint`          | `-e`  | Storage service endpoint URL      | Yes      |
| `--access-key-id`     | `-a`  | Access key ID                     | Yes      |
| `--secret-access-key` | `-s`  | Secret access key                 | Yes      |
| `--region`            | `-r`  | Storage region                    | No       |
| `--force-path-style`  | `-F`  | Force path-style URLs (for MinIO) | No       |
| `--force`             | `-f`  | Overwrite existing connection     | No       |

### Examples

**AWS S3**:

```bash
colibri storage connect \
  --endpoint https://s3.amazonaws.com \
  --access-key-id AKIAIOSFODNN7EXAMPLE \
  --secret-access-key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  --region us-east-1
```

**MinIO (local)**:

```bash
colibri storage connect \
  --endpoint http://localhost:9000 \
  --access-key-id minioadmin \
  --secret-access-key minioadmin \
  --force-path-style
```

**Cloudflare R2**:

```bash
colibri storage connect \
  --endpoint https://abc123.r2.cloudflarestorage.com \
  --access-key-id your-access-key \
  --secret-access-key your-secret-key \
  --region auto
```

**Backblaze B2**:

```bash
colibri storage connect \
  --endpoint https://s3.us-west-004.backblazeb2.com \
  --access-key-id your-key-id \
  --secret-access-key your-application-key \
  --region us-west-004
```

**DigitalOcean Spaces**:

```bash
colibri storage connect \
  --endpoint https://nyc3.digitaloceanspaces.com \
  --access-key-id your-access-key \
  --secret-access-key your-secret-key \
  --region nyc3
```

### Reading Credentials from stdin

For security, you can pipe the secret key:

```bash
echo "your-secret-key" | colibri storage connect \
  --endpoint https://s3.amazonaws.com \
  --access-key-id YOUR_KEY \
  --secret-access-key -
```

Or from environment variable:

```bash
export S3_SECRET_KEY="your-secret-key"
echo "$S3_SECRET_KEY" | colibri storage connect \
  --endpoint https://s3.amazonaws.com \
  --access-key-id YOUR_KEY \
  --secret-access-key -
```

### Connection Storage

Credentials are stored in the database, not in config files, ensuring they're shared across all instances connecting to the same database.

### Testing the Connection

The connect command verifies connectivity before saving:

```bash
colibri storage connect \
  --endpoint https://s3.amazonaws.com \
  --access-key-id YOUR_KEY \
  --secret-access-key YOUR_SECRET \
  --verbose
```

Output:

```
Testing connection to https://s3.amazonaws.com...
✓ Connection successful
✓ Credentials saved
Connected to storage provider "https://s3.amazonaws.com".
```

## colibri storage list-objects

List all objects (files) in a storage bucket.

```bash
colibri storage list-objects [bucket] [options]
```

### Arguments

- `[bucket]` - Bucket name (uses default if omitted)

### Aliases

```bash
colibri storage list
colibri storage ls
```

### Examples

**List all objects in default bucket**:

```bash
colibri storage list-objects
```

Output:

```
Key                                Size        Last Modified           Storage Class
──────────────────────────────────────────────────────────────────────────────────────
assets/abc123/original.epub       1.2 MB      2024-01-15 10:30:00    STANDARD
assets/def456/original.mobi       850 KB      2024-01-16 14:22:00    STANDARD
covers/work123/original.jpg       450 KB      2024-01-15 10:31:00    STANDARD
covers/work123/thumbnail.jpg      12 KB       2024-01-15 10:31:00    STANDARD
```

**List specific bucket**:

```bash
colibri storage list-objects my-bucket
```

**Filter by prefix**:

```bash
# List only covers
colibri storage list-objects --prefix covers/

# List objects for specific work
colibri storage list-objects --prefix covers/work123/
```

**JSON output**:

```bash
colibri storage list-objects --json
```

Output:

```json
[
  {
    "Key": "assets/abc123/original.epub",
    "Size": 1258291,
    "LastModified": "2024-01-15T10:30:00Z",
    "StorageClass": "STANDARD",
    "ETag": "d8e8fca2dc0f896fd7cb4cb0031ba249"
  }
]
```

**Count objects**:

```bash
colibri storage list-objects --json | jq 'length'
```

**Calculate total size**:

```bash
colibri storage list-objects --json | \
  jq '[.[].Size] | add' | \
  numfmt --to=iec
```

## colibri storage copy

Copy an object within storage.

```bash
colibri storage copy <source> <destination>
```

### Arguments

- `<source>` - Source object path
- `<destination>` - Destination object path

### Aliases

```bash
colibri storage cp
```

### Examples

**Copy within same bucket**:

```bash
colibri storage copy assets/old.epub assets/new.epub
```

**Backup a cover**:

```bash
colibri storage copy \
  covers/work123/original.jpg \
  backups/covers/work123-backup.jpg
```

**Duplicate for testing**:

```bash
colibri storage copy \
  assets/production.epub \
  assets/test-copy.epub
```

## colibri storage move

Move (rename) an object in storage.

```bash
colibri storage move <bucket> <source> <destination>
```

### Arguments

- `<bucket>` - Bucket name
- `<source>` - Source object path
- `<destination>` - Destination object path

### Aliases

```bash
colibri storage mv
```

### Examples

**Rename a file**:

```bash
colibri storage move colibri \
  assets/old-name.epub \
  assets/new-name.epub
```

**Reorganize structure**:

```bash
colibri storage move colibri \
  old-folder/file.epub \
  new-folder/file.epub
```

> **Note**: Move performs a copy followed by delete. Large files may take time.

## colibri storage remove

Delete one or more objects from storage.

```bash
colibri storage remove <keys...> [options]
```

### Arguments

- `<keys...>` - One or more object keys to delete

### Options

| Option    | Short | Description              |
| --------- | ----- | ------------------------ |
| `--force` | `-f`  | Skip confirmation prompt |

### Aliases

```bash
colibri storage rm
```

### Examples

**Delete single object**:

```bash
colibri storage remove assets/old-book.epub
```

Output:

```
Warning: This will permanently delete 1 object(s).
Are you sure? (y/N): y
✓ Deleted assets/old-book.epub
```

**Force delete without confirmation**:

```bash
colibri storage remove assets/old-book.epub --force
```

**Delete multiple objects**:

```bash
colibri storage remove \
  assets/book1.epub \
  assets/book2.epub \
  covers/work1/old.jpg \
  --force
```

**Delete by pattern (using shell)**:

```bash
# Delete all temporary imports
colibri storage list-objects --json | \
  jq -r '.[] | select(.Key | startswith("imports/")) | .Key' | \
  xargs colibri storage rm --force
```

**Clean up old backups**:

```bash
# Delete backups older than 30 days
colibri storage list-objects backups/ --json | \
  jq -r --arg cutoff "$(date -d '30 days ago' -Iseconds)" \
    '.[] | select(.LastModified < $cutoff) | .Key' | \
  xargs -r colibri storage rm --force
```

> **Warning**: Deletion is permanent and cannot be undone unless you have bucket versioning enabled.

## colibri storage list-buckets

List all available buckets in your storage account.

```bash
colibri storage list-buckets
```

### Aliases

```bash
colibri storage lb
```

### Examples

**List buckets**:

```bash
colibri storage list-buckets
```

Output:

```
Name              Created                  Region
────────────────────────────────────────────────────
colibri          2024-01-01T00:00:00Z     us-east-1
colibri-backup   2024-01-15T00:00:00Z     us-east-1
```

**JSON output**:

```bash
colibri storage list-buckets --json
```

```json
[
  {
    "Name": "colibri",
    "CreationDate": "2024-01-01T00:00:00Z"
  },
  {
    "Name": "colibri-backup",
    "CreationDate": "2024-01-15T00:00:00Z"
  }
]
```

## colibri storage make-bucket

Create a new bucket.

```bash
colibri storage make-bucket <bucket>
```

### Arguments

- `<bucket>` - Name of the bucket to create

### Aliases

```bash
colibri storage mb
```

### Examples

**Create bucket**:

```bash
colibri storage make-bucket colibri-test
```

Output:

```
✓ Created bucket: colibri-test
```

**Create with error handling**:

```bash
if colibri storage make-bucket new-bucket 2>/dev/null; then
  echo "Bucket created successfully"
else
  echo "Failed to create bucket (may already exist)"
fi
```

## colibri storage remove-bucket

Delete an empty bucket.

```bash
colibri storage remove-bucket <bucket>
```

### Arguments

- `<bucket>` - Name of the bucket to delete

### Aliases

```bash
colibri storage rb
```

### Examples

**Delete bucket**:

```bash
colibri storage remove-bucket old-bucket
```

> **Note**: Bucket must be empty before deletion. Use `colibri storage rm` to delete contents first.

## Configuration and Credentials

### Viewing Current Configuration

```bash
# Check configured endpoint
colibri settings get --json | jq -r '.storage'
```

### Environment Variable Override

You can override storage configuration per-command:

```bash
export S3_ENDPOINT=https://s3.amazonaws.com
export S3_ACCESS_KEY=YOUR_KEY
export S3_SECRET_KEY=YOUR_SECRET

colibri storage list-objects
```

### Multiple Storage Backends

Switch between different storage providers:

```bash
# Configure primary storage
colibri storage connect \
  --endpoint https://s3.amazonaws.com \
  --access-key-id KEY1 \
  --secret-access-key SECRET1

# Use different storage temporarily
S3_ENDPOINT=https://backup-storage.com \
S3_ACCESS_KEY=KEY2 \
S3_SECRET_KEY=SECRET2 \
  colibri storage list-objects
```

## Common Workflows

### Backup Entire Library

```bash
#!/bin/bash
# backup-storage.sh

BACKUP_DIR="./colibri-backup-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Download all assets
colibri storage list-objects --json | \
  jq -r '.[].Key' | \
  while read key; do
    mkdir -p "$BACKUP_DIR/$(dirname "$key")"
    # Use AWS CLI or similar to download
    aws s3 cp "s3://colibri/$key" "$BACKUP_DIR/$key"
  done

echo "Backup complete: $BACKUP_DIR"
```

### Migrate to New Storage Provider

```bash
#!/bin/bash
# migrate-storage.sh

# Step 1: Export from old provider
OLD_ENDPOINT="https://old-storage.com"
NEW_ENDPOINT="https://new-storage.com"

# Configure rclone for both providers
rclone config create old-storage s3 \
  provider AWS \
  endpoint "$OLD_ENDPOINT" \
  access_key_id "$OLD_ACCESS_KEY" \
  secret_access_key "$OLD_SECRET_KEY"

rclone config create new-storage s3 \
  provider AWS \
  endpoint "$NEW_ENDPOINT" \
  access_key_id "$NEW_ACCESS_KEY" \
  secret_access_key "$NEW_SECRET_KEY"

# Step 2: Sync data
rclone sync old-storage:colibri new-storage:colibri --progress

# Step 3: Update Colibri configuration
colibri storage connect \
  --endpoint "$NEW_ENDPOINT" \
  --access-key-id "$NEW_ACCESS_KEY" \
  --secret-access-key "$NEW_SECRET_KEY" \
  --force

echo "Migration complete"
```

### Clean Up Old Imports

```bash
#!/bin/bash
# cleanup-imports.sh

# Delete imports older than 7 days
CUTOFF=$(date -d '7 days ago' -Iseconds)

colibri storage list-objects --json | \
  jq -r --arg cutoff "$CUTOFF" \
    '.[] | select(.Key | startswith("imports/")) |
     select(.LastModified < $cutoff) | .Key' | \
  xargs -r colibri storage rm --force

echo "Cleanup complete"
```

### Storage Usage Report

```bash
#!/bin/bash
# storage-report.sh

echo "Storage Usage Report - $(date)"
echo "================================"

# Count objects by type
echo "Assets: $(colibri storage ls --json | jq '[.[] | select(.Key | startswith("assets/"))] | length')"
echo "Covers: $(colibri storage ls --json | jq '[.[] | select(.Key | startswith("covers/"))] | length')"
echo "Imports: $(colibri storage ls --json | jq '[.[] | select(.Key | startswith("imports/"))] | length')"

# Total size
TOTAL_BYTES=$(colibri storage ls --json | jq '[.[].Size] | add')
TOTAL_GB=$(echo "scale=2; $TOTAL_BYTES / 1024 / 1024 / 1024" | bc)

echo "Total Size: ${TOTAL_GB} GB"
```

### Verify Storage Integrity

```bash
#!/bin/bash
# verify-storage.sh

# Check if all database assets exist in storage
colibri works list --json | \
  jq -r '.[].assets[].storageKey' | \
  while read key; do
    if ! colibri storage ls --json | jq -e --arg key "$key" '.[] | select(.Key == $key)' > /dev/null; then
      echo "Missing: $key"
    fi
  done
```

## Troubleshooting

### Connection Errors

**Problem**: "Unable to connect to storage endpoint"

**Solutions**:

```bash
# Verify endpoint is accessible
curl -I https://s3.amazonaws.com

# Test with verbose output
colibri storage connect \
  --endpoint https://s3.amazonaws.com \
  --access-key-id YOUR_KEY \
  --secret-access-key YOUR_SECRET \
  --verbose

# Check firewall/network
telnet s3.amazonaws.com 443
```

### Authentication Errors

**Problem**: "Access Denied" or "Invalid credentials"

**Solutions**:

```bash
# Verify credentials
aws s3 ls s3://colibri \
  --endpoint-url https://s3.amazonaws.com \
  --profile test

# Check IAM permissions (AWS)
aws iam get-user-policy \
  --user-name colibri-storage \
  --policy-name S3Access

# Test with different region
colibri storage connect \
  --endpoint https://s3.amazonaws.com \
  --access-key-id YOUR_KEY \
  --secret-access-key YOUR_SECRET \
  --region us-west-2
```

### Path Style vs Virtual Hosted

**Problem**: "Bucket not found" with MinIO or some providers

**Solution**: Enable path-style URLs:

```bash
colibri storage connect \
  --endpoint http://localhost:9000 \
  --access-key-id minioadmin \
  --secret-access-key minioadmin \
  --force-path-style  # Important for MinIO
```

**Explanation**:

- **Virtual-hosted style**: `https://bucket.s3.amazonaws.com/object`
- **Path style**: `https://s3.amazonaws.com/bucket/object`

MinIO and some S3-compatible providers require path style.

### SSL Certificate Errors

**Problem**: "SSL certificate verify failed"

**Solutions**:

```bash
# For development/testing only - skip SSL verification
# (Not recommended for production)
export AWS_CA_BUNDLE=""
export NODE_TLS_REJECT_UNAUTHORIZED="0"

# Or install proper certificates
# For MinIO, use a proper domain with Let's Encrypt
```

### Slow Operations

**Problem**: Storage commands are slow

**Solutions**:

```bash
# Use closer region
colibri storage connect \
  --endpoint https://s3.eu-west-1.amazonaws.com \
  --region eu-west-1 \
  --access-key-id YOUR_KEY \
  --secret-access-key YOUR_SECRET

# Enable connection pooling (automatic in SDK)
# Check network bandwidth
speedtest

# For large files, consider multipart upload settings
```

### Permission Denied on Delete

**Problem**: Cannot delete objects

**Solutions**:

```bash
# Check IAM policy includes DeleteObject
# For AWS, ensure policy has:
{
  "Effect": "Allow",
  "Action": ["s3:DeleteObject"],
  "Resource": "arn:aws:s3:::colibri/*"
}

# Verify object ownership
colibri storage ls --json | jq '.[] | select(.Key == "problem-file.epub")'

# Try with force flag
colibri storage rm problem-file.epub --force
```

## Security Best Practices

1. **Rotate credentials regularly**

   ```bash
   # Generate new keys every 90 days
   # Update with connect command
   colibri storage connect --force --access-key-id NEW_KEY ...
   ```

2. **Use IAM policies with least privilege**

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::colibri/*"
       }
     ]
   }
   ```

3. **Never commit credentials to version control**

   ```bash
   # Use environment variables
   export S3_ACCESS_KEY="..."
   export S3_SECRET_KEY="..."
   ```

4. **Enable MFA delete for production** (AWS S3)

   ```bash
   aws s3api put-bucket-versioning \
     --bucket colibri \
     --versioning-configuration MFADelete=Enabled
   ```

5. **Monitor access logs**
   ```bash
   # Enable S3 access logging
   aws s3api put-bucket-logging \
     --bucket colibri \
     --bucket-logging-status file://logging.json
   ```

## Performance Tips

1. **Use regions close to your server**: Reduces latency
2. **Enable CDN for frequently accessed content**: CloudFront, Cloudflare
3. **Consider Cloudflare R2 for high traffic**: Zero egress fees
4. **Use lifecycle rules**: Auto-delete old imports
5. **Enable compression**: For text-based files (epub, xml)
6. **Batch operations**: Group multiple uploads/deletes

## See Also

- [Storage Configuration](/setup/storage) - Setting up S3 storage
- [CLI Overview](/user-guide/cli) - General CLI usage
- [Works Commands](/user-guide/cli/works) - Manage books (which use storage)

## External Tools

Useful tools for working with S3 storage:

- **AWS CLI**: Official AWS command-line tool
- **s3cmd**: Command-line S3 client
- **rclone**: Sync files between storage providers
- **MinIO Client (mc)**: Official MinIO CLI
- **Cyberduck**: GUI client for S3

```bash
# Install AWS CLI
pip install awscli

# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Install MinIO client
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
```
