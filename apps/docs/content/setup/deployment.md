---
title: Self-Hosting Deployment
description: Deploy Colibri in production environments
date: 2024-01-01
order: 1
tags: [deployment, production, operators, security]
relevance: 80
---

# Self-Hosting Deployment

This guide covers deploying Colibri in production environments with best practices for security, performance, and
reliability.

## Deployment Options

### Docker Compose (Recommended)

Best for:

- Self-hosted servers
- VPS deployments
- Home servers
- Small to medium instances

### Node.js

Best for:

- Custom infrastructure
- Platform-specific optimizations
- Integration with existing systems

### Serverless

Best for:

- Cloudflare Pages
- Vercel
- AWS Lambda with adapters

## Docker Compose Deployment

### Prerequisites

- Ubuntu 22.04+ or Debian 12+ (recommended)
- Docker 20.10+
- Docker Compose 2.0+
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)

### Quick Setup

1. **Clone the repository**

```bash
git clone https://github.com/colibri-hq/colibri.git
cd colibri
```

2. **Configure environment**

```bash
cp .env.example .env
nano .env
```

Required settings:

```bash
# Database
DATABASE_URL=postgresql://colibri:CHANGE_THIS_PASSWORD@postgres:5432/colibri

# Storage
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=CHANGE_THIS_KEY
S3_SECRET_KEY=CHANGE_THIS_SECRET
S3_BUCKET=colibri

# Application
PUBLIC_BASE_URL=https://library.example.com
NODE_ENV=production

# WebAuthn
WEBAUTHN_RP_ID=library.example.com
WEBAUTHN_RP_NAME=My Library
```

3. **Start services**

```bash
docker-compose up -d
```

4. **Verify deployment**

```bash
docker-compose ps
docker-compose logs app
```

### Reverse Proxy Setup

#### Nginx

Create `/etc/nginx/sites-available/colibri`:

```nginx
server {
    listen 80;
    server_name library.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name library.example.com;

    ssl_certificate /etc/letsencrypt/live/library.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/library.example.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for large file uploads
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Increase max upload size
    client_max_body_size 100M;
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/colibri /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Caddy

Create `Caddyfile`:

```
library.example.com {
    reverse_proxy localhost:3000

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Large file uploads
    request_body {
        max_size 100MB
    }
}
```

### SSL Certificates

#### Let's Encrypt (Certbot)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d library.example.com
```

Auto-renewal is set up automatically.

## Node.js Deployment

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 15+
- S3-compatible storage (configured separately)
- Process manager (PM2, systemd)

### Build for Production

```bash
# Install dependencies
corepack enable pnpm
pnpm install --frozen-lockfile

# Build all packages
pnpm build

# Build just the app
pnpm build:app
```

### Environment Configuration

Create `.env` in the repository root:

```bash
DATABASE_URL=postgresql://user:pass@db.example.com:5432/colibri?sslmode=require
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=your-key
S3_SECRET_KEY=your-secret
S3_BUCKET=colibri-prod
S3_REGION=us-east-1
PUBLIC_BASE_URL=https://library.example.com
NODE_ENV=production
PORT=3000
```

### Using PM2

Install PM2:

```bash
npm install -g pm2
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "colibri",
      cwd: "./apps/app",
      script: "build/index.js",
      instances: "max",
      exec_mode: "cluster",
      env: { NODE_ENV: "production", PORT: 3000 },
      max_memory_restart: "500M",
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
```

Start the app:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Using systemd

Create `/etc/systemd/system/colibri.service`:

```ini
[Unit]
Description = Colibri Library
After = network.target postgresql.service

[Service]
Type = simple
User = colibri
WorkingDirectory = /opt/colibri/apps/app
Environment = NODE_ENV=production
EnvironmentFile = /opt/colibri/.env
ExecStart = /usr/bin/node build/index.js
Restart = always
RestartSec = 10

[Install]
WantedBy = multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable colibri
sudo systemctl start colibri
sudo systemctl status colibri
```

## Database Setup

### PostgreSQL Production Configuration

#### Using Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Get connection string from Settings > Database
3. Update `DATABASE_URL` in `.env`
4. Run migrations:

```bash
pnpx supabase db push
```

#### Self-Hosted PostgreSQL

Configure `postgresql.conf`:

```
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 6553kB
min_wal_size = 1GB
max_wal_size = 4GB
```

Create database and user:

```sql
create user colibri with password 'secure_password';
create database colibri owner colibri;
```

Run migrations:

```bash
DATABASE_URL="postgresql://colibri:password@localhost/colibri" \
  pnpx supabase db push
```

### Backup Strategy

#### Automated Backups

Set up daily backups with cron:

```bash
#!/bin/bash
# /opt/colibri/backup.sh

BACKUP_DIR="/var/backups/colibri"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump $DATABASE_URL > "$BACKUP_DIR/db_$DATE.sql"

# Compress
gzip "$BACKUP_DIR/db_$DATE.sql"

# Keep only last 30 days
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/db_$DATE.sql.gz" s3://my-backups/colibri/
```

Add to crontab:

```bash
0 2 * * * /opt/colibri/backup.sh
```

## Storage Configuration

### Production S3 Setup

#### AWS S3

1. Create bucket with private access
2. Create IAM user with policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::your-bucket-name", "arn:aws:s3:::your-bucket-name/*"]
    }
  ]
}
```

3. Configure CORS:

```json
[
  {
    "AllowedOrigins": ["https://library.example.com"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3600
  }
]
```

#### Cloudflare R2

1. Create bucket in R2 dashboard
2. Generate API tokens
3. Update `.env`:

```bash
S3_ENDPOINT=https://account-id.r2.cloudflarestorage.com
S3_ACCESS_KEY=your-r2-access-key
S3_SECRET_KEY=your-r2-secret-key
S3_BUCKET=colibri
```

## Monitoring

### Health Checks

Create `/health` endpoint checks:

```bash
#!/bin/bash
# health-check.sh

response=$(curl -s -o /dev/null -w "%{http_code}" https://library.example.com)

if [ $response -eq 200 ]; then
  echo "OK"
  exit 0
else
  echo "FAILED: HTTP $response"
  exit 1
fi
```

### Log Management

#### Using Docker

View logs:

```bash
docker-compose logs -f app
docker-compose logs --tail=100 app
```

Configure log rotation in `docker-compose.yml`:

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### Using PM2

```bash
pm2 logs colibri
pm2 logs colibri --lines 100
pm2 flush  # Clear logs
```

### Metrics

Monitor with PM2:

```bash
pm2 monit
```

Or integrate with monitoring tools:

- Prometheus
- Grafana
- Datadog
- New Relic

## Security Hardening

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

### Security Headers

Already configured in nginx example above. Key headers:

- `Strict-Transport-Security`: Force HTTPS
- `X-Frame-Options`: Prevent clickjacking
- `X-Content-Type-Options`: Prevent MIME sniffing
- `Referrer-Policy`: Control referrer information

### Rate Limiting

Configure in nginx:

```nginx
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=1r/s;

location / {
    limit_req zone=general burst=20 nodelay;
    # ... other config
}

location /api/upload {
    limit_req zone=upload burst=3 nodelay;
    # ... other config
}
```

### Database Security

- Use strong passwords
- Enable SSL connections
- Restrict network access
- Regular security updates

## Performance Optimization

### Caching

Configure Redis for session storage (optional):

```bash
REDIS_URL=redis://localhost:6379
```

### CDN Integration

Use a CDN for static assets:

1. Upload built assets to CDN
2. Configure asset URLs
3. Set long cache headers

### Database Optimization

```bash
# Run VACUUM
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check slow queries
psql $DATABASE_URL -c "
  SELECT query, mean_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"
```

## Scaling

### Horizontal Scaling

For high-traffic instances:

1. Run multiple app instances
2. Use load balancer (nginx, HAProxy)
3. Shared PostgreSQL
4. Shared S3 storage
5. Shared Redis for sessions

### Vertical Scaling

Recommended specs by library size:

| Library Size     | RAM  | CPU      | Storage |
| ---------------- | ---- | -------- | ------- |
| &lt; 1,000 books | 2GB  | 2 cores  | 50GB    |
| 1,000-10,000     | 4GB  | 4 cores  | 200GB   |
| 10,000+          | 8GB+ | 8+ cores | 500GB+  |

## Troubleshooting

### App Won't Start

Check logs:

```bash
docker-compose logs app
# or
pm2 logs colibri --lines 50
```

Common issues:

- Database connection failed
- S3 credentials invalid
- Port already in use

### Database Connection Errors

Verify connection:

```bash
psql $DATABASE_URL -c "SELECT version();"
```

### Storage Errors

Test S3 connection:

```bash
colibri storage connect
```

## Maintenance

### Updates

```bash
# Pull latest code
git pull origin main

# Update dependencies
pnpm install

# Rebuild
pnpm build

# Restart
docker-compose restart app
# or
pm2 restart colibri
```

### Database Migrations

```bash
pnpx supabase db push
```

Always backup before running migrations!

## Support

For deployment issues:

- Check documentation: [colibri-hq.org](https://colibri-hq.org)
- GitHub issues: [github.com/colibri-hq/colibri/issues](https://github.com/colibri-hq/colibri/issues)
- Community forum (if available)
