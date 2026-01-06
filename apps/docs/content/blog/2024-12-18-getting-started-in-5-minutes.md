---
title: "Get Started with Colibri in 5 Minutes"
description: A quick-start guide to setting up your self-hosted ebook library
date: 2024-12-18
author: "Moritz Mazetti <moritz@example.com>"
layout: blog
tags: [tutorial, getting-started, docker, installation]
heroImage: https://tailwindcss.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcard.2d498a85.jpg&w=3840&q=75
heroAlt: Terminal window showing Colibri installation progress
excerpt: From zero to a fully functional ebook library in just 5 minutes. Here's the fastest way to get Colibri running.
relevance: 85
---

Want to get Colibri up and running quickly? This guide will have you managing your ebook library in just 5 minutes.

## Prerequisites

You'll need:

- **Docker** and **Docker Compose** installed
- A folder with your ebook files
- 5 minutes of your time

## Step 1: Create the Configuration (1 minute)

Create a new directory and add a `docker-compose.yml`:

```yaml
version: "3.8"

services:
  colibri:
    image: colibri/colibri:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./books:/app/books
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/colibri
      - S3_ENDPOINT=http://minio:9000
      - S3_ACCESS_KEY=minioadmin
      - S3_SECRET_KEY=minioadmin

  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=colibri

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

## Step 2: Start the Services (1 minute)

```bash
docker-compose up -d
```

Wait for the containers to start:

```bash
docker-compose logs -f colibri
```

You'll see:

```
✓ Database connected
✓ Storage configured
✓ Server listening on port 3000
```

## Step 3: Create Your Account (1 minute)

1. Open `http://localhost:3000` in your browser
2. Click **Create Account**
3. Set up your passkey (fingerprint or security key)

No passwords to remember!

## Step 4: Import Your Books (2 minutes)

### Option A: Web Upload

1. Click the **+** button
2. Drag and drop your ebook files
3. Watch the magic happen

### Option B: Folder Import

Place books in the `./books` folder, then:

```bash
docker-compose exec colibri colibri works import /app/books
```

## That's It!

Your library is ready. Colibri will automatically:

- ✅ Extract metadata from your books
- ✅ Fetch covers and descriptions
- ✅ Identify authors and series
- ✅ Generate reading statistics

## Next Steps

Now that you're up and running:

- [Organize with collections](/user-guide/collections)
- [Set up external access](/setup/deployment)
- [Configure metadata sources](/user-guide/metadata-enrichment)
- [Connect your e-reader via OPDS](/user-guide/opds)

## Troubleshooting

### Port 3000 is in use

Change the port in `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Use port 8080 instead
```

### Database connection errors

Make sure PostgreSQL is fully started:

```bash
docker-compose logs db
```

### Import is slow

Large libraries take time. Check progress:

```bash
docker-compose exec colibri colibri works list --pending
```

## Need Help?

- Check the [full documentation](/getting-started)
- Join our [community chat](https://github.com/colibri-hq/colibri/discussions)
- File an [issue on GitHub](https://github.com/colibri-hq/colibri/issues)

Happy reading! 📚
