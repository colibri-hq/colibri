---
title: Storage Configuration
description: Configure S3-compatible storage for Colibri
date: 2024-01-01
order: 3
tags: [storage, s3, minio, operators, configuration]
relevance: 75
---

# Storage Configuration

Colibri uses S3-compatible object storage for storing ebook files, cover images, and temporary upload data. This guide will help you set up storage for your instance.

## What is S3-Compatible Storage?

S3-compatible storage refers to object storage services that implement the Amazon S3 API. This allows Colibri to work with various storage providers using the same interface. Benefits include:

- **Scalability**: Store unlimited ebooks without worrying about disk space
- **Durability**: Cloud providers typically replicate data across multiple locations
- **Cost-effective**: Pay only for what you use, with competitive pricing
- **CDN integration**: Easily distribute content globally with low latency
- **Separation of concerns**: Storage is independent of your application server

## Supported Storage Providers

Colibri supports any S3-compatible storage provider. Here are the most popular options:

### MinIO (Self-Hosted)

MinIO is the recommended option for local development and self-hosted deployments.

#### Local Development with Docker

MinIO is included in the Docker Compose setup:

```bash
docker-compose up -d minio
```

Configuration (already set in docker-compose.yaml):

```bash
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=colibri
S3_REGION=us-east-1
```

#### Standalone MinIO Installation

For production self-hosting:

1. Download MinIO:

   ```bash
   wget https://dl.min.io/server/minio/release/linux-amd64/minio
   chmod +x minio
   ```

2. Start MinIO server:

   ```bash
   MINIO_ROOT_USER=admin MINIO_ROOT_PASSWORD=your-secure-password \
     ./minio server /data --console-address ":9001"
   ```

3. Access the MinIO Console at `http://localhost:9001`
4. Create a bucket named `colibri` (or your preferred name)
5. Create an access key and secret key in the console

### AWS S3

Amazon S3 is a reliable, battle-tested option with global availability.

#### Setup Steps

1. **Create a bucket**:
   - Go to AWS Console > S3
   - Click "Create bucket"
   - Choose a unique name (e.g., `my-colibri-library`)
   - Select your preferred region
   - Keep "Block all public access" enabled
   - Create the bucket

2. **Create an IAM user**:
   - Go to IAM > Users > Add user
   - Choose a name (e.g., `colibri-storage`)
   - Select "Access key - Programmatic access"

3. **Create and attach a policy**:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
         "Resource": "arn:aws:s3:::my-colibri-library"
       },
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::my-colibri-library/*"
       }
     ]
   }
   ```

4. **Configure environment variables**:
   ```bash
   S3_ENDPOINT=https://s3.amazonaws.com
   S3_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
   S3_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   S3_BUCKET=my-colibri-library
   S3_REGION=us-east-1
   ```

### Cloudflare R2

Cloudflare R2 offers S3-compatible storage with zero egress fees, making it ideal for frequently accessed content.

#### Setup Steps

1. **Create an R2 bucket**:
   - Go to Cloudflare Dashboard > R2
   - Click "Create bucket"
   - Choose a bucket name
   - Select your location

2. **Generate API tokens**:
   - Click "Manage R2 API Tokens"
   - Create a new API token with read/write permissions
   - Save the Access Key ID and Secret Access Key

3. **Configure environment variables**:
   ```bash
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   S3_ACCESS_KEY=your-access-key-id
   S3_SECRET_KEY=your-secret-access-key
   S3_BUCKET=my-colibri-library
   S3_REGION=auto
   ```

**Benefits of R2**:

- No egress fees (free data transfer out)
- Lower storage costs than S3
- Integrated with Cloudflare CDN
- Automatic geographic distribution

### Backblaze B2

Backblaze B2 offers affordable S3-compatible storage with a generous free tier.

#### Setup Steps

1. **Create a B2 bucket**:
   - Go to Backblaze > Buckets > Create a Bucket
   - Choose "Private" bucket type
   - Select your region

2. **Generate application keys**:
   - Go to App Keys > Add a New Application Key
   - Restrict to the bucket you created
   - Save the keyID and applicationKey

3. **Configure environment variables**:
   ```bash
   S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
   S3_ACCESS_KEY=your-key-id
   S3_SECRET_KEY=your-application-key
   S3_BUCKET=my-colibri-library
   S3_REGION=us-west-004
   ```

**Benefits of B2**:

- 10 GB free storage
- Very low storage costs ($0.005/GB/month)
- Simple pricing model
- B2 CLI for bulk operations

### DigitalOcean Spaces

DigitalOcean Spaces provides S3-compatible storage with CDN included.

#### Setup Steps

1. **Create a Space**:
   - Go to DigitalOcean > Spaces > Create Space
   - Choose a region close to your users
   - Select a unique name

2. **Generate API keys**:
   - Go to API > Spaces access keys
   - Generate New Key
   - Save the Access Key and Secret Key

3. **Configure environment variables**:
   ```bash
   S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
   S3_ACCESS_KEY=your-access-key
   S3_SECRET_KEY=your-secret-key
   S3_BUCKET=my-colibri-library
   S3_REGION=nyc3
   ```

**Benefits of Spaces**:

- Built-in CDN included in pricing
- Predictable pricing ($5/month for 250 GB)
- Easy integration with DigitalOcean infrastructure
- Simple management UI

## Bucket Configuration

### Access Control

Your S3 bucket should be configured with:

1. **Private access** (no public read/write)
   - All file access goes through Colibri's authentication
   - Prevents unauthorized downloads

2. **CORS policy** for browser uploads (if using presigned URLs)

### CORS Configuration

For AWS S3, DigitalOcean Spaces, and other providers supporting CORS:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://your-colibri-instance.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

For MinIO, use the console or CLI:

```bash
mc cors set myminio/colibri <<EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT"],
      "AllowedHeaders": ["*"]
    }
  ]
}
EOF
```

### Lifecycle Rules (Optional)

Set up lifecycle rules to automatically clean up temporary files:

```json
{
  "Rules": [
    {
      "Id": "DeleteTempUploads",
      "Status": "Enabled",
      "Prefix": "imports/",
      "Expiration": {
        "Days": 7
      }
    }
  ]
}
```

## Storage Structure

Colibri organizes files in the bucket using a logical structure:

```
bucket/
├── assets/           # Ebook files (.epub, .mobi, .pdf)
│   └── {asset-id}/
│       └── original.epub
├── covers/           # Cover images (original and thumbnails)
│   └── {work-id}/
│       ├── original.jpg
│       ├── medium.jpg
│       └── thumbnail.jpg
└── imports/          # Temporary upload storage
    └── {import-id}/
        └── temp-file.epub
```

### File Naming Conventions

- **Assets**: Named by asset UUID (`original.epub`, `original.mobi`, etc.)
- **Covers**: Named by size (`original.jpg`, `medium.jpg`, `thumbnail.jpg`)
- **Imports**: Temporary files deleted after successful import

## Performance Optimization

### CDN Integration

For better performance, especially with global users:

1. **Cloudflare CDN** (works with any S3 provider):
   - Add your storage endpoint as a custom hostname
   - Configure cache rules for images (long TTL)
   - Set up purge rules for updated content

2. **CloudFront** (for AWS S3):
   - Create a CloudFront distribution
   - Set S3 bucket as origin
   - Configure cache behaviors:
     - `/covers/*` - Cache for 1 year
     - `/assets/*` - Cache for 1 month
     - `/imports/*` - No cache

3. **Provider-native CDN**:
   - DigitalOcean Spaces includes CDN automatically
   - Cloudflare R2 integrates with Cloudflare CDN

### Caching Headers

Colibri sets appropriate cache headers:

```
Cache-Control: public, max-age=31536000, immutable  # Covers
Cache-Control: private, max-age=3600                # Assets
Cache-Control: no-cache                             # Imports
```

### Regional Considerations

- Choose a storage region close to your users
- For global deployments, consider multi-region replication
- Use CDN for global distribution

## Migration Between Providers

### Export from Current Provider

Using the CLI:

```bash
# List all objects
colibri storage list-objects > objects.txt

# Download assets
mkdir -p backup/assets backup/covers
colibri storage copy assets/ backup/assets/
colibri storage copy covers/ backup/covers/
```

### Upload to New Provider

```bash
# Configure new storage
colibri storage connect \
  --endpoint https://new-provider.com \
  --access-key-id NEW_KEY \
  --secret-access-key NEW_SECRET

# Upload assets
aws s3 sync backup/assets s3://new-bucket/assets/
aws s3 sync backup/covers s3://new-bucket/covers/
```

### Using rclone

For provider-to-provider transfer without downloading:

```bash
# Configure rclone for both providers
rclone config

# Sync directly
rclone sync old-provider:colibri new-provider:colibri --progress
```

## Troubleshooting

### Connection Errors

**Symptom**: "Unable to connect to storage"

**Solutions**:

- Verify endpoint URL is correct (include `https://`)
- Check access key and secret key
- Ensure bucket exists
- Verify network connectivity

```bash
# Test connection
colibri storage connect \
  --endpoint https://s3.amazonaws.com \
  --access-key-id YOUR_KEY \
  --secret-access-key YOUR_SECRET
```

### Permission Errors

**Symptom**: "Access Denied" when uploading files

**Solutions**:

- Check IAM policy includes required permissions
- Verify bucket name matches configuration
- Ensure access keys haven't expired
- For MinIO, check user permissions in console

### CORS Errors

**Symptom**: "CORS policy blocked" in browser console

**Solutions**:

- Add your instance URL to CORS allowed origins
- Include all necessary HTTP methods (GET, PUT, POST)
- Allow `*` for AllowedHeaders during debugging
- Restart your application after CORS changes

### Slow Upload/Download

**Symptoms**: Files take a long time to transfer

**Solutions**:

- Choose a storage region closer to your server
- Enable CDN for frequently accessed content
- Check network bandwidth limits
- For MinIO, ensure sufficient server resources
- Consider enabling compression for large files

### Import Files Not Cleaning Up

**Symptom**: Old files accumulating in `imports/` folder

**Solutions**:

- Configure lifecycle rules to auto-delete old imports
- Manually clean up using CLI:
  ```bash
  colibri storage rm imports/* --force
  ```

### Storage Costs Growing Unexpectedly

**Symptoms**: Higher than expected storage bills

**Solutions**:

- Audit storage usage: `colibri storage list-objects --json | jq`
- Remove duplicate uploads
- Enable lifecycle rules for temporary files
- Consider cheaper providers (B2, R2)
- Compress images more aggressively in settings

## Environment Variables Reference

| Variable              | Description                       | Example                    |
| --------------------- | --------------------------------- | -------------------------- |
| `S3_ENDPOINT`         | Storage service endpoint URL      | `https://s3.amazonaws.com` |
| `S3_ACCESS_KEY`       | Access key ID                     | `AKIAIOSFODNN7EXAMPLE`     |
| `S3_SECRET_KEY`       | Secret access key                 | `wJalrXUtnFEMI/K7MDENG...` |
| `S3_BUCKET`           | Default bucket name               | `colibri`                  |
| `S3_REGION`           | Storage region                    | `us-east-1`                |
| `S3_FORCE_PATH_STYLE` | Force path-style URLs (for MinIO) | `true`                     |

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for sensitive configuration
3. **Rotate access keys** regularly (every 90 days)
4. **Use least-privilege IAM policies** (only required permissions)
5. **Enable bucket versioning** for disaster recovery
6. **Monitor access logs** for suspicious activity
7. **Enable encryption at rest** (if supported by provider)
8. **Use VPC endpoints** (AWS) or private networking when possible

## Next Steps

- [Configure your application](/setup/configuration) with storage credentials
- [Upload your first book](/user-guide/uploading-books) to test storage
- [Set up CLI storage commands](/user-guide/cli/storage) for bulk operations
- [Configure CDN](/setup/deployment) for production deployments
