---
title: Installation
description: Detailed installation guide for Colibri
date: 2024-01-01
order: 1
tags: [installation, docker, operators, guide]
relevance: 90
---

# Installation

This guide covers detailed installation options for Colibri, a self-hosted ebook library management system.

## System Requirements

Before installing Colibri, ensure your system meets these requirements:

### Hardware

- **CPU**: 2+ cores recommended
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 10GB+ for the application, plus space for your ebook library
- **Network**: Stable internet connection for metadata enrichment

### Software

- **Operating System**: Linux, macOS, or Windows with WSL2
- **Node.js**: 18.0.0 or higher
- **PostgreSQL**: 15 or higher
- **S3-compatible storage**: MinIO, AWS S3, or compatible service

## Installation Methods

### Docker Installation (Recommended)

The easiest way to run Colibri is with Docker Compose. This method includes all required services and handles configuration automatically.

#### 1. Prerequisites

Install Docker and Docker Compose:

- **Linux**: Follow the [official Docker installation guide](https://docs.docker.com/engine/install/)
- **macOS**: Install [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Windows**: Install [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)

#### 2. Clone the Repository

```bash
git clone https://github.com/colibri-hq/colibri.git
cd colibri
```

#### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your settings. At minimum, set:

```bash
# Database (auto-configured by Docker Compose)
DB_URL=postgres://colibri:colibri@postgres:5432/colibri

# Storage (auto-configured for MinIO)
STORAGE_S3_URL=http://minio:9000
S3_PROTOCOL_ACCESS_KEY_ID=colibri
S3_PROTOCOL_ACCESS_KEY_SECRET=password
S3_PROTOCOL_REGION=us-east-1

# Application
PUBLIC_BASE_URL=http://localhost:3000
APP_SECRET_KEY=<generate-random-key>
```

Generate a secure secret key:

```bash
# Linux/macOS
openssl rand -hex 32

# Or use any random string generator
```

#### 4. Start Services

```bash
docker-compose up -d
```

This starts:

- **PostgreSQL**: Database server on port 5432
- **MinIO**: S3-compatible storage on port 9000
- **Colibri**: Web application on port 3000

#### 5. Verify Installation

Check that all services are running:

```bash
docker-compose ps
```

You should see three services with status "Up":

```
NAME                IMAGE                       STATUS
colibri-web         colibri:latest              Up
colibri_postgres    postgres:18                 Up
colibri_minio       minio/minio:latest          Up
```

#### 6. Access the Application

Open your browser and navigate to `http://localhost:3000`

You'll be greeted with the Colibri setup wizard to create your first account.

#### 7. (Optional) Access MinIO Console

MinIO provides a web console for managing storage:

- URL: `http://localhost:9001`
- Username: `colibri`
- Password: `password`

### Manual Installation

For development or custom deployments, you can install Colibri manually without Docker.

#### 1. Prerequisites

Install required software:

**Node.js 18+**:

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify
node --version  # Should show v18.x.x or higher
```

**pnpm**:

```bash
# Enable corepack (included with Node.js 16.13+)
corepack enable pnpm

# Verify
pnpm --version
```

**PostgreSQL 15+**:

- **Ubuntu/Debian**: `sudo apt install postgresql postgresql-contrib`
- **macOS**: `brew install postgresql@15`
- **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)

**Supabase CLI** (for local development):

```bash
npm install -g supabase
```

#### 2. Clone and Install

```bash
# Clone the repository
git clone https://github.com/colibri-hq/colibri.git
cd colibri

# Install dependencies
corepack enable pnpm
pnpm install
```

#### 3. Set Up Database

**Option A: Use Supabase Local (Recommended for Development)**

Start a local Supabase instance with Docker:

```bash
pnpx supabase start
```

This starts PostgreSQL and other Supabase services. The command outputs connection details.

**Option B: Use External PostgreSQL**

Create a database manually:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE colibri;
CREATE USER colibri WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE colibri TO colibri;
\q
```

Run the schema initialization:

```bash
# Apply schema files
psql -U colibri -d colibri -f supabase/schemas/00_common.sql
psql -U colibri -d colibri -f supabase/schemas/01_authentication.sql
# ... repeat for all schema files in order

# Apply migrations
psql -U colibri -d colibri -f supabase/migrations/20251225151111_schema.sql
psql -U colibri -d colibri -f supabase/migrations/20251226212735_pending_ingestion.sql

# Seed data
psql -U colibri -d colibri -f supabase/seeds/languages.sql
```

#### 4. Set Up Storage

**Option A: Use MinIO (Local S3)**

Install and run MinIO:

```bash
# macOS
brew install minio/stable/minio
minio server /path/to/data --console-address :9001

# Linux
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
./minio server /path/to/data --console-address :9001
```

Create a bucket:

```bash
# Install MinIO client
brew install minio/stable/mc  # macOS
# or download from https://min.io/docs/minio/linux/reference/minio-mc.html

# Configure
mc alias set local http://localhost:9000 minioadmin minioadmin

# Create bucket
mc mb local/colibri
```

**Option B: Use AWS S3**

Create an S3 bucket via AWS Console or CLI:

```bash
aws s3 mb s3://your-colibri-bucket --region us-east-1
```

See the [Storage Configuration](/setup/storage) guide for detailed S3 setup.

#### 5. Configure Environment

```bash
# Copy example environment
cp .env.example .env

# If using Supabase local, add connection details
pnpx supabase status --output env >> .env
```

Edit `.env`:

```bash
# Database
DB_URL=postgresql://colibri:password@localhost:5432/colibri

# Storage (MinIO example)
STORAGE_S3_URL=http://localhost:9000
S3_PROTOCOL_ACCESS_KEY_ID=minioadmin
S3_PROTOCOL_ACCESS_KEY_SECRET=minioadmin
S3_PROTOCOL_REGION=us-east-1
S3_BUCKET_ASSETS=colibri
S3_BUCKET_COVERS=colibri

# Application
PUBLIC_BASE_URL=http://localhost:5173
APP_SECRET_KEY=<your-random-key>
SESSION_ID_COOKIE_NAME=ksid
AUTH_TOKEN_COOKIE_NAME=ktok

# JWT (if using Supabase, these are auto-filled)
JWT_SECRET=<your-jwt-secret>
SERVICE_ROLE_KEY=<your-service-role-key>
ANON_KEY=<your-anon-key>
```

#### 6. Build the Application

```bash
# Build all packages
pnpm build
```

#### 7. Start Development Server

```bash
# Run all services in development mode
pnpm dev

# Or run only the web app
pnpm dev:app
```

The application will be available at `http://localhost:5173`.

#### 8. Generate Database Types (Development)

When the database schema changes, regenerate TypeScript types:

```bash
cd packages/sdk
pnpm types
```

## Production Deployment

For production environments, follow these additional steps.

### 1. Use Managed Services

We recommend using managed services for reliability:

- **Database**: [Supabase](https://supabase.com), [Neon](https://neon.tech), AWS RDS, or DigitalOcean Managed PostgreSQL
- **Storage**: AWS S3, Cloudflare R2, Backblaze B2, or DigitalOcean Spaces
- **Application**: Deploy to any Node.js hosting (Vercel, Fly.io, Railway, DigitalOcean App Platform)

### 2. Build for Production

```bash
# Build all packages
pnpm build

# The web app is in apps/app/build/
```

### 3. Set Production Environment Variables

```bash
# Production settings
NODE_ENV=production
PUBLIC_BASE_URL=https://your-domain.com

# Use secure, random secrets
APP_SECRET_KEY=<generate-long-random-string>
JWT_SECRET=<generate-jwt-secret>

# Production database (with SSL)
DB_URL=postgresql://user:pass@db.example.com:5432/colibri?sslmode=require
DATABASE_CERTIFICATE=<base64-encoded-ca-cert>  # Optional

# Production storage
STORAGE_S3_URL=https://s3.amazonaws.com  # or your S3 provider
S3_PROTOCOL_ACCESS_KEY_ID=<your-key>
S3_PROTOCOL_ACCESS_KEY_SECRET=<your-secret>
S3_PROTOCOL_REGION=us-east-1
S3_BUCKET_ASSETS=your-bucket
S3_BUCKET_COVERS=your-bucket

# Optional: External metadata APIs
GOOGLE_BOOKS_API_KEY=<your-key>
```

### 4. Run Behind a Reverse Proxy

Use nginx or Caddy as a reverse proxy with HTTPS:

**Nginx example**:

```nginx
server {
    listen 443 ssl http2;
    server_name library.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Caddy example**:

```caddyfile
library.example.com {
    reverse_proxy localhost:3000
}
```

### 5. Set Up Process Manager

Use PM2 or systemd to keep the application running:

**PM2**:

```bash
# Install PM2
npm install -g pm2

# Start application
cd apps/app
pm2 start build/index.js --name colibri

# Set up auto-restart on reboot
pm2 startup
pm2 save
```

**systemd**:

Create `/etc/systemd/system/colibri.service`:

```ini
[Unit]
Description=Colibri Ebook Library
After=network.target postgresql.service

[Service]
Type=simple
User=colibri
WorkingDirectory=/var/www/colibri/apps/app
Environment=NODE_ENV=production
EnvironmentFile=/var/www/colibri/.env
ExecStart=/usr/bin/node build/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable colibri
sudo systemctl start colibri
sudo systemctl status colibri
```

### 6. Set Up Backups

**Database backups**:

```bash
# Automated daily backup
0 2 * * * pg_dump -U colibri colibri | gzip > /backups/colibri-$(date +\%Y\%m\%d).sql.gz
```

**Storage backups**:

Use your S3 provider's versioning and backup features, or set up periodic snapshots.

## Updating Colibri

### Docker Installation

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Manual Installation

```bash
# Pull latest changes
git pull origin main

# Update dependencies
pnpm install

# Rebuild
pnpm build

# Restart application
pm2 restart colibri
# or
sudo systemctl restart colibri
```

## Troubleshooting

### Database Connection Failed

**Symptoms**: "Connection refused" or "timeout" errors

**Solutions**:

- Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check DATABASE_URL format: `postgresql://user:pass@host:port/database`
- Ensure firewall allows port 5432
- For Supabase: Run `pnpx supabase status` to verify services

### Storage Connection Failed

**Symptoms**: "Access denied" or "bucket not found" errors

**Solutions**:

- Verify MinIO is running: `curl http://localhost:9000/minio/health/live`
- Check credentials in `.env` match MinIO configuration
- Ensure bucket exists: `mc ls local/` (MinIO) or check S3 console
- Verify STORAGE_S3_URL points to correct endpoint

### Port Already in Use

**Symptoms**: "EADDRINUSE" error

**Solutions**:

- Check what's using the port: `lsof -i :3000`
- Stop conflicting service or change Colibri's port in `.env`
- For Docker: Check for stale containers with `docker ps -a`

### Build Fails

**Symptoms**: TypeScript or build errors

**Solutions**:

- Clear node_modules: `rm -rf node_modules && pnpm install`
- Clear build cache: `pnpm clean` (if available) or manually delete `build/` dirs
- Ensure Node.js version is 18+: `node --version`
- Check for dependency conflicts: `pnpm why <package-name>`

### Migration Errors

**Symptoms**: "relation already exists" or schema errors

**Solutions**:

- Reset database: `pnpx supabase db reset` (development only!)
- For production: Manually inspect and fix schema
- Check migration order in `supabase/migrations/`

## Next Steps

After installation, you should:

1. **[Configure your instance](/setup/configuration)** - Set up environment variables and instance settings
2. **[Set up storage](/setup/storage)** - Configure S3-compatible storage in detail
3. **Complete the setup wizard** - Create your first account
4. **[Upload your first book](/user-guide/uploading-books)** - Start building your library
5. **[Configure metadata providers](/user-guide/metadata-enrichment)** - Enable external metadata sources

## Getting Help

If you encounter issues not covered here:

- **Documentation**: Check the [Troubleshooting Guide](/setup/troubleshooting)
- **GitHub Issues**: [Report a bug](https://github.com/colibri-hq/colibri/issues)
