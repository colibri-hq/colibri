---
title: Setup & Deployment
description: Installation, configuration, and deployment guides for Colibri
date: 2024-01-01
order: 1
tags: [setup, installation, deployment, configuration, docker]
relevance: 85
---

# Setup & Deployment

This section covers everything you need to get Colibri up and running, from initial installation to production deployment.

## Installation Guides

| Guide                                 | Description                                                   |
| ------------------------------------- | ------------------------------------------------------------- |
| [Installation](/setup/installation)   | Complete installation instructions for all deployment methods |
| [Configuration](/setup/configuration) | Environment variables, settings, and customization options    |
| [Storage](/setup/storage)             | S3-compatible storage setup (MinIO, AWS S3, Cloudflare R2)    |

## Deployment

| Guide                                     | Description                                         |
| ----------------------------------------- | --------------------------------------------------- |
| [Deployment](/setup/deployment)           | Production deployment strategies and best practices |
| [Troubleshooting](/setup/troubleshooting) | Common issues and their solutions                   |

## Architecture

| Guide                                        | Description                              |
| -------------------------------------------- | ---------------------------------------- |
| [Architecture Overview](/setup/architecture) | Technical architecture and system design |

## Quick Start

For the fastest path to a running Colibri instance, see the [Quick Start](/getting-started/quick-start) guide.

### Deployment Methods

Colibri supports multiple deployment methods to fit your infrastructure:

#### Docker Compose (Recommended)

The simplest way to deploy Colibri with all dependencies:

```bash
# Clone the repository
git clone https://github.com/colibri-hq/colibri.git
cd colibri

# Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# Start all services
docker compose up -d
```

This starts:

- **Colibri web application** - Main application server
- **PostgreSQL** - Database server
- **MinIO** - S3-compatible object storage

#### Manual Installation

For advanced users who want full control:

1. Set up PostgreSQL 15+
2. Configure S3-compatible storage
3. Install Node.js 18+
4. Build and run the application

See the [Installation Guide](/setup/installation) for detailed instructions.

## Configuration Overview

### Required Environment Variables

| Variable         | Description                  |
| ---------------- | ---------------------------- |
| `DB_URL`         | PostgreSQL connection string |
| `JWT_SECRET`     | Secret key for JWT tokens    |
| `APP_SECRET_KEY` | Secret for URL signing       |

### Storage Configuration

| Variable               | Description                |
| ---------------------- | -------------------------- |
| `S3_ENDPOINT`          | S3-compatible endpoint URL |
| `S3_ACCESS_KEY_ID`     | Storage access key         |
| `S3_SECRET_ACCESS_KEY` | Storage secret key         |
| `S3_BUCKET`            | Default bucket name        |

See [Configuration](/setup/configuration) for the complete reference.

## System Requirements

### Minimum Requirements

- **CPU**: 2 cores
- **RAM**: 2 GB
- **Storage**: 10 GB (plus space for your library)
- **Docker**: 20.10+ with Compose v2

### Recommended for Production

- **CPU**: 4+ cores
- **RAM**: 4+ GB
- **Storage**: SSD with adequate space for your collection
- **Network**: Stable internet for metadata enrichment

See [Requirements](/getting-started/requirements) for detailed specifications.

## Security Considerations

### Authentication

Colibri supports multiple authentication methods:

- **Passkeys (WebAuthn)** - Passwordless, phishing-resistant authentication
- **Email Passcodes** - One-time codes for fallback access
- **OAuth 2.0** - Third-party application access
- **API Keys** - Programmatic access with scoped permissions

### Network Security

For production deployments:

1. **Use HTTPS**: Always deploy behind a reverse proxy with TLS
2. **Firewall rules**: Restrict database and storage access
3. **Secrets management**: Use environment variables or secrets managers
4. **Regular updates**: Keep all components updated

## Next Steps

1. **[Install Colibri](/setup/installation)** - Get Colibri running
2. **[Configure your instance](/setup/configuration)** - Set up environment and settings
3. **[Set up storage](/setup/storage)** - Configure S3-compatible storage
4. **[Deploy to production](/setup/deployment)** - Production deployment guide
5. **[Upload your first book](/user-guide/uploading-books)** - Start building your library

## Getting Help

- **[Troubleshooting Guide](/setup/troubleshooting)** - Common issues and solutions
- **[GitHub Discussions](https://github.com/colibri-hq/colibri/discussions)** - Community support
- **[GitHub Issues](https://github.com/colibri-hq/colibri/issues)** - Bug reports
