---
title: "Colibri v3.1: OPDS Support and Reading Progress"
description: The first minor release of v3 brings OPDS catalog support, reading progress sync, and many quality-of-life improvements
date: 2025-01-04
author: "Moritz Mazetti <moritz@example.com>"
layout: blog
tags: [release, features, v3, opds]
heroImage: https://tailwindcss.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fhero.53718e60.jpg&w=3840&q=75
heroAlt: Colibri v3.1 release banner showing OPDS and reading progress icons
excerpt: OPDS catalog support is here! Plus reading progress sync, improved search, and dozens of community-requested features.
featured: true
series: "Release Notes"
seriesOrder: 2
relevance: 95
---

Just three weeks after our v3.0 launch, we're excited to release **Colibri v3.1** with some of our most requested features.

## OPDS Catalog Support

You can now access your Colibri library from any OPDS-compatible reader:

- **Moon+ Reader** on Android
- **KyBook** on iOS
- **Calibre** on desktop
- And many more!

### Setting Up OPDS

1. Go to **Settings → Integrations**
2. Enable **OPDS Catalog**
3. Copy your personal feed URL
4. Add it to your favorite reader

Your feed URL includes authentication, so keep it private.

## Reading Progress Sync

Never lose your place again:

```
📖 Page 234 of 512
🕐 Last read: 2 hours ago
📱 Synced from: iPhone
```

Reading progress syncs across all your devices automatically. We support:

- Percentage-based progress
- Page numbers (when available)
- Chapter markers
- Bookmarks and highlights

## Search Improvements

Thanks to community feedback, search is now smarter:

| Feature | Example |
|---------|---------|
| Fuzzy matching | "Tolkein" finds "Tolkien" |
| Author variations | "JRR Tolkien" finds "J.R.R. Tolkien" |
| Series search | "expanse 3" finds book 3 |
| ISBN lookup | Paste an ISBN directly |

## Quality of Life

Dozens of small improvements:

- **Faster imports** - 3x faster for large libraries
- **Better covers** - Smart cropping for non-standard sizes
- **Keyboard shortcuts** - Press `?` to see them all
- **Dark mode tweaks** - Easier on the eyes at night

## Breaking Changes

None! v3.1 is fully compatible with v3.0.

## Upgrade Instructions

```bash
# Docker users
docker pull colibri/colibri:v3.1
docker-compose up -d

# Manual installation
git pull
pnpm install
pnpm build
```

## What's Next for v3.2

We're already working on:

- **Annotations export** - Export highlights to Markdown
- **Social features** - Share reading lists with friends
- **Statistics dashboard** - Track your reading habits

## Thank You

Special thanks to our contributors this release:

- @bookworm42 for OPDS implementation help
- @searchmaster for search improvements
- @reader-sync for the reading progress RFC
- Everyone who reported bugs and suggested features!

See the full [changelog on GitHub](https://github.com/colibri-hq/colibri/releases/tag/v3.1.0).
