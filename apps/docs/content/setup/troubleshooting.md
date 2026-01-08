---
title: Troubleshooting Guide
description: Common issues and solutions for self-hosted Colibri instances
date: 2024-01-01
order: 2
tags: [troubleshooting, support, operators, debugging]
relevance: 70
---

# Troubleshooting Guide

This guide covers common issues you may encounter when running Colibri and how to resolve them.

## Installation Issues

### Docker Compose Won't Start

**Symptoms:**

- `docker-compose up` fails
- Services keep restarting
- Connection refused errors

**Diagnosis:**

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs app
docker-compose logs postgres
docker-compose logs minio
```

**Common Solutions:**

1. **Port already in use**

```bash
# Check what's using port 3000
sudo lsof -i :3000

# Stop the conflicting service or change Colibri's port
PORT=3001 docker-compose up
```

2. **Permission issues**

```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

3. **Insufficient resources**

```bash
# Check Docker resources
docker info | grep -i memory
docker info | grep -i cpus

# Increase in Docker Desktop settings or docker-compose.yml
```

### Database Connection Failures

**Symptoms:**

- "Connection refused"
- "Role does not exist"
- "Database does not exist"

**Diagnosis:**

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check if PostgreSQL is running
docker-compose ps postgres
# or
sudo systemctl status postgresql
```

**Solutions:**

1. **Database not started**

```bash
# Start with Docker Compose
docker-compose up postgres -d

# Wait for it to be ready
docker-compose logs -f postgres
# Look for "database system is ready to accept connections"
```

2. **Wrong credentials**

Check `.env` file:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
```

Each part must match your PostgreSQL configuration.

3. **Run migrations**

```bash
pnpx supabase db push
```

### S3/MinIO Connection Issues

**Symptoms:**

- "Access Denied"
- "NoSuchBucket"
- File uploads fail

**Diagnosis:**

```bash
# Test storage with CLI
colibri storage connect

# Check MinIO logs
docker-compose logs minio
```

**Solutions:**

1. **Bucket doesn't exist**

Create it manually:

```bash
# Using MinIO console
open http://localhost:9001

# Or using AWS CLI
aws --endpoint-url http://localhost:9000 \
    s3 mb s3://colibri
```

2. **Wrong credentials**

Verify in `.env`:

```bash
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
```

3. **CORS issues**

Configure CORS in MinIO console or:

```bash
aws --endpoint-url http://localhost:9000 \
    s3api put-bucket-cors \
    --bucket colibri \
    --cors-configuration file://cors.json
```

## Authentication Problems

### Can't Create Passkey

**Symptoms:**

- "This device doesn't support passkeys"
- Browser doesn't prompt for authentication
- Passkey creation fails silently

**Solutions:**

1. **Browser compatibility**

Use a supported browser:

- Chrome 90+
- Safari 15+
- Firefox 90+
- Edge 90+

Update to latest version.

2. **HTTPS required**

WebAuthn only works over HTTPS (or localhost).

For local development:

```bash
# Use localhost, not 127.0.0.1
http://localhost:3000
```

For production, ensure SSL is configured.

3. **Incorrect RP ID**

Check `.env`:

```bash
PUBLIC_BASE_URL=https://library.example.com
WEBAUTHN_RP_ID=library.example.com  # Must match domain
```

### Login Fails After Passkey Creation

**Symptoms:**

- Passkey registered successfully
- Login attempt fails with "invalid signature"

**Solutions:**

1. **Time synchronization**

```bash
# Check system time
date

# Sync time (Ubuntu/Debian)
sudo apt install ntp
sudo systemctl start ntp
```

2. **Database issues**

Check if user was created:

```bash
psql $DATABASE_URL -c "SELECT id, email FROM users;"
```

3. **Clear browser data**

Clear site data and try again:

- Chrome: Settings > Privacy > Clear browsing data
- Safari: Develop > Empty Caches

## Upload Issues

### File Upload Fails

**Symptoms:**

- Upload stuck at 0%
- "File too large" error
- Upload completes but book not in library

**Diagnosis:**

```bash
# Check upload queue logs
docker-compose logs -f app | grep upload

# Check storage space
df -h
```

**Solutions:**

1. **File size limits**

Increase in nginx:

```nginx
client_max_body_size 100M;
```

And in Node.js (if applicable):

```bash
NODE_OPTIONS="--max-http-header-size=16384"
```

2. **Storage space**

Free up space or increase disk size:

```bash
# Check Docker volumes
docker system df

# Clean up
docker system prune -a
```

3. **Timeout issues**

Increase timeouts in nginx:

```nginx
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

### Metadata Extraction Fails

**Symptoms:**

- Upload completes but no metadata
- "Failed to parse ebook" error

**Solutions:**

1. **Corrupted file**

Try opening the ebook in a reader to verify it's valid.

2. **Unsupported format**

Check format:

```bash
file yourbook.epub
```

Colibri supports:

- EPUB (all versions)
- MOBI, AZW, AZW3
- PDF

3. **Parser errors**

Check logs for specific error:

```bash
docker-compose logs app | grep -i parse
```

## Metadata Enrichment Problems

### No Metadata Found

**Symptoms:**

- "No results found" when enriching
- Confidence scores all 0%

**Diagnosis:**

```bash
# Check if providers are accessible
curl -I https://openlibrary.org
curl -I https://www.wikidata.org
```

**Solutions:**

1. **No ISBN**

The book may not have an ISBN. Try:

- Adding ISBN manually if you know it
- Using title/author search instead

2. **Network issues**

Check outbound connectivity:

```bash
# Test from inside container
docker-compose exec app curl https://openlibrary.org
```

Configure proxy if needed:

```bash
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=http://proxy.example.com:8080
```

3. **Rate limiting**

You may have hit provider rate limits. Wait and try again later.

### Enrichment Takes Too Long

**Symptoms:**

- Enrichment running for minutes
- Eventually times out

**Solutions:**

1. **Reduce provider count**

Disable slow providers in Settings > Metadata Providers.

2. **Increase timeout**

In `.env`:

```bash
METADATA_TIMEOUT=60000  # 60 seconds
```

3. **Check network latency**

```bash
# Test provider response times
time curl -I https://www.wikidata.org
```

## Performance Issues

### Slow Page Loads

**Diagnosis:**

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://library.example.com

# curl-format.txt:
# time_total: %{time_total}s
```

**Solutions:**

1. **Database optimization**

```bash
# Run VACUUM
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Add indexes if needed
psql $DATABASE_URL -c "
  CREATE INDEX IF NOT EXISTS idx_works_title
  ON works USING GIN (to_tsvector('english', title));
"
```

2. **Memory issues**

Increase container memory:

```yaml
# docker-compose.yml
services:
  app:
    mem_limit: 1g
```

3. **Too many concurrent users**

Scale horizontally with multiple instances.

### High CPU Usage

**Diagnosis:**

```bash
# Check CPU usage
docker stats

# Or with PM2
pm2 monit
```

**Solutions:**

1. **Metadata enrichment running**

This is CPU-intensive. It's normal during batch operations.

2. **Infinite loops**

Check logs for errors:

```bash
docker-compose logs app | tail -100
```

3. **Optimize queries**

Enable query logging and find slow queries:

```sql
ALTER DATABASE colibri SET log_min_duration_statement = 1000;
```

## Search Issues

### Search Returns No Results

**Symptoms:**

- Search always returns empty
- Book exists but isn't found

**Solutions:**

1. **Reindex search**

```bash
psql $DATABASE_URL -c "
  REINDEX INDEX idx_works_search;
  VACUUM ANALYZE works;
"
```

2. **Check search configuration**

Verify full-text search is configured:

```sql
SELECT * FROM pg_ts_config;
```

### Search is Slow

**Solutions:**

1. **Add indexes**

```bash
psql $DATABASE_URL -f supabase/migrations/add_search_indexes.sql
```

2. **Reduce result set**

Use filters to narrow searches.

## SSL/HTTPS Issues

### Certificate Errors

**Symptoms:**

- "Your connection is not private"
- Certificate expired
- WebAuthn fails

**Solutions:**

1. **Renew Let's Encrypt certificate**

```bash
sudo certbot renew
sudo systemctl reload nginx
```

2. **Check certificate validity**

```bash
openssl s_client -connect library.example.com:443 -servername library.example.com
```

3. **Update WebAuthn RP ID**

Must match certificate domain in `.env`:

```bash
WEBAUTHN_RP_ID=library.example.com
```

## Data Issues

### Missing Books

**Symptoms:**

- Books uploaded but not visible
- Books disappeared

**Diagnosis:**

```bash
# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM works;"

# Check storage
colibri storage list
```

**Solutions:**

1. **Database/storage mismatch**

Re-sync:

```bash
colibri works sync-storage
```

2. **Filter active**

Check if you have filters applied in the UI.

### Duplicate Books

**Symptoms:**

- Same book appears multiple times
- Duplicate detection not working

**Solutions:**

1. **Merge duplicates**

```bash
colibri works merge <id1> <id2>
```

2. **Improve detection**

Add ISBN or improve metadata.

## Backup and Recovery

### Restore from Backup

1. **Restore database**

```bash
# Stop app
docker-compose stop app

# Restore database
gunzip < backup.sql.gz | psql $DATABASE_URL

# Start app
docker-compose start app
```

2. **Restore storage**

```bash
# Sync from backup bucket
aws s3 sync s3://backup-bucket/ s3://colibri-bucket/
```

### Corrupted Database

If migrations failed:

```bash
# Reset to last good migration
pnpx supabase db reset

# Restore from backup
psql $DATABASE_URL < backup.sql
```

## Getting Help

### Collect Debug Information

Before seeking help, collect:

```bash
# System info
uname -a
docker --version
docker-compose --version

# App info
cat .env | grep -v SECRET | grep -v PASSWORD
docker-compose ps
docker-compose logs --tail=100 app

# Database info
psql $DATABASE_URL -c "SELECT version();"
```

### Where to Get Help

1. **Documentation**: [colibri-hq.org](https://colibri-hq.org)
2. **GitHub Issues**: [github.com/colibri-hq/colibri/issues](https://github.com/colibri-hq/colibri/issues)
3. **Discussions**: GitHub Discussions for questions

### Reporting Bugs

Include:

1. Colibri version (`git rev-parse HEAD`)
2. Deployment method (Docker, Node.js, etc.)
3. Environment (OS, versions)
4. Steps to reproduce
5. Logs and error messages
6. Expected vs actual behavior

## Prevention

### Regular Maintenance

```bash
# Weekly
docker system prune -f
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Monthly
# Update dependencies
pnpm update

# Rebuild
pnpm build
docker-compose build --no-cache

# Test backup restoration
```

### Monitoring

Set up alerts for:

- Disk space &lt; 10% free
- Database connection failures
- High CPU/memory usage
- Failed backups
- SSL certificate expiration

### Keep Updated

```bash
# Watch for updates
git fetch origin
git log HEAD..origin/main --oneline

# Update safely
git pull origin main
pnpm install
pnpm build
docker-compose restart app
```
