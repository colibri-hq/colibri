---
title: Privacy Policy
description: How Colibri handles your data and protects your privacy
date: 2024-01-01
order: 1
tags: [privacy, legal, data, security]
relevance: 50
---

# Privacy Policy

**Last updated: January 2024**

Colibri is designed with privacy as a core principle. As a self-hosted application, you maintain complete control over your data.

## Our Philosophy

We believe your reading habits, library contents, and personal data belong to you—not to us or any third party. Colibri is built to give you the benefits of modern ebook management without compromising your privacy.

## This Documentation Site

This documentation website (`docs.colibri.app`) is committed to respecting your privacy:

### What We Don't Collect

- **No analytics or tracking** - We don't use Google Analytics, Plausible, or any other tracking service
- **No cookies** - This site doesn't set any cookies
- **No personal data** - We don't collect names, emails, or any identifying information
- **No fingerprinting** - We don't track you across sessions or devices

### What We Do Use

- **Local storage** - Theme preferences (light/dark mode) are stored in your browser's local storage and never sent to any server
- **Search index** - Search functionality runs entirely in your browser using [Pagefind](https://pagefind.app/)
- **GitHub API** - We fetch public repository statistics (star count) to display in the navigation. This request is cached locally and doesn't include any user data

### Third-Party Services

- **GitHub** - The "Edit on GitHub" links direct you to GitHub, which has its own [privacy policy](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement)
- **Giscus** - Blog post comments use [Giscus](https://giscus.app/), which requires a GitHub account. Giscus loads only when you scroll to the comments section

## Self-Hosted Colibri Instances

When you run your own Colibri instance:

### Data Storage

All data is stored on your own server:

- **Library data** - Book metadata, covers, and files are stored in your configured database and storage backend
- **User accounts** - User data remains on your server
- **Reading history** - Any reading progress or history stays local to your instance

### External Connections

Your Colibri instance may connect to external services for metadata enrichment:

- **Open Library** - For book metadata lookup
- **WikiData** - For author and publisher information
- **Google Books** - For additional metadata and covers
- **Other providers** - Various national libraries and bibliographic databases

These connections:
- Only occur when you explicitly request metadata enrichment
- Send only the book identifiers (ISBN, title, author) needed for the lookup
- Don't include any user information
- Can be disabled in your instance settings

### Your Control

As the instance administrator, you have full control over:

- Which metadata providers are enabled
- What data is stored
- Who has access to your library
- Data backup and deletion

## Questions

If you have questions about this privacy policy or Colibri's privacy practices, please:

- Open an issue on [GitHub](https://github.com/colibri-hq/colibri/issues)
- Join the community discussions on GitHub

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in the "Last updated" date above. Since Colibri is open source, you can view the [change history](https://github.com/colibri-hq/colibri/commits/main/apps/docs/content/legal/privacy.md) of this document on GitHub.
