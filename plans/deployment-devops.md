> **GitHub Issue:** [#124](https://github.com/colibri-hq/colibri/issues/124)

# Deployment & DevOps

## Description

Comprehensive deployment strategy, infrastructure management, backup procedures, and operational documentation for
running Colibri in production.

## Current Implementation Status

**Partially Configured:**

- ✅ Docker Compose setup exists
- ✅ Turborepo for monorepo management
- ✅ Supabase for database/auth infrastructure
- ✅ Environment configuration (.env files)

**Not Complete:**

- ❌ No deployment documentation
- ❌ No CI/CD pipeline
- ❌ No backup strategy documented
- ❌ No scaling guidance
- ❌ No monitoring setup
- ❌ No disaster recovery plan

## Implementation Plan

### Phase 1: Deployment Documentation

1. Create deployment guide:
   - Prerequisites
   - Environment setup
   - Database initialization
   - S3/storage configuration
   - First-run setup

2. Deployment options:
   - Docker Compose (self-hosted)
   - Kubernetes (scalable)
   - Vercel/Netlify + Supabase (managed)

### Phase 2: Docker Production Configuration

1. Multi-stage Dockerfiles:

   ```dockerfile
   # Build stage
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY . .
   RUN pnpm install --frozen-lockfile
   RUN pnpm build

   # Production stage
   FROM node:20-alpine
   WORKDIR /app
   COPY --from=builder /app/apps/app/build ./build
   COPY --from=builder /app/node_modules ./node_modules
   CMD ["node", "build"]
   ```

2. Docker Compose production:
   - App service
   - PostgreSQL (or external Supabase)
   - S3-compatible storage (MinIO)
   - Redis (for caching/sessions)
   - Caddy/Traefik for reverse proxy

### Phase 3: CI/CD Pipeline

1. GitHub Actions workflows:

   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy
   on:
     push:
       branches: [main]

   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - run: pnpm install
         - run: pnpm test
         - run: pnpm build

     deploy:
       needs: test
       runs-on: ubuntu-latest
       steps:
         - name: Deploy to production
           run: # deployment commands
   ```

2. Environments:
   - Development (PR previews)
   - Staging (main branch)
   - Production (tags/releases)

### Phase 4: Database Management

1. Migration strategy:

   ```bash
   # Apply migrations
   pnpm supabase db push

   # Generate types
   pnpm --filter @colibri-hq/sdk types
   ```

2. Backup procedures:
   - Automated daily backups
   - Point-in-time recovery
   - Backup verification
   - Restoration procedures

### Phase 5: Storage Configuration

1. S3 bucket setup:
   - Assets bucket (ebooks, covers)
   - Backups bucket
   - Lifecycle rules
   - Access policies

2. CDN configuration (optional):
   - CloudFront/Cloudflare
   - Cache rules
   - Custom domain

### Phase 6: Monitoring Setup

1. Application monitoring:
   - Uptime checks
   - Error rate tracking
   - Performance metrics

2. Infrastructure monitoring:
   - Resource usage
   - Database performance
   - Storage capacity

3. Alerting:
   - Service down alerts
   - Error spike alerts
   - Resource threshold alerts

### Phase 7: Scaling Strategy

1. Horizontal scaling:
   - Stateless app containers
   - Load balancer configuration
   - Session management (Redis)

2. Database scaling:
   - Read replicas
   - Connection pooling
   - Query optimization

### Phase 8: Disaster Recovery

1. Recovery procedures:
   - Database restoration
   - Storage recovery
   - Configuration recovery

2. Recovery time objectives:
   - RTO: 4 hours
   - RPO: 1 hour

## Infrastructure Diagram

```
┌─────────────────────────────────────────┐
│              Load Balancer              │
│            (Caddy/Traefik)              │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌───▼───┐          ┌───▼───┐
│ App 1 │          │ App 2 │
└───┬───┘          └───┬───┘
    │                   │
    └─────────┬─────────┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│Postgres│ │ Redis │ │  S3   │
└────────┘ └───────┘ └───────┘
```

## Environment Configuration

```bash
# Required
DATABASE_URL=
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

# Optional
REDIS_URL=
SMTP_HOST=
SENTRY_DSN=
```

## Open Questions

1. **Hosting**: Self-hosted, managed Kubernetes, or PaaS?
2. **Database**: Self-managed Postgres or Supabase?
3. **CDN**: Worth the complexity for ebook delivery?
4. **Multi-Region**: Support for geographic distribution?
5. **Backup Frequency**: Hourly, daily, or continuous?
6. **Secrets**: HashiCorp Vault, AWS Secrets Manager, or env vars?
7. **Logging**: Self-hosted (Loki) or managed (Datadog)?
8. **Cost**: Budget constraints for infrastructure?
