---
title: Packages Overview
description: Overview of Colibri's published packages
date: 2024-01-01
order: 1
tags: [packages, sdk, developers, overview]
relevance: 70
---

# Packages

Colibri is built as a monorepo with several published packages that you can use independently.

## Available Packages

| Package                                                          | Description                                   | npm                                                                  |
|------------------------------------------------------------------|-----------------------------------------------|----------------------------------------------------------------------|
| [@colibri-hq/sdk](/packages/sdk)                                 | Core SDK with database, metadata, and storage | [npm](https://www.npmjs.com/package/@colibri-hq/sdk)                 |
| [@colibri-hq/mobi](/packages/mobi)                               | MOBI/Mobipocket ebook parser                  | [npm](https://www.npmjs.com/package/@colibri-hq/mobi)                |
| [@colibri-hq/pdf](/packages/pdf)                                 | PDF.js wrapper with conditional exports       | [npm](https://www.npmjs.com/package/@colibri-hq/pdf)                 |
| [@colibri-hq/oauth](/packages/oauth)                             | OAuth 2.0 authorization server                | [npm](https://www.npmjs.com/package/@colibri-hq/oauth)               |
| [@colibri-hq/open-library-client](/packages/open-library-client) | Open Library API client                       | [npm](https://www.npmjs.com/package/@colibri-hq/open-library-client) |
| [@colibri-hq/languages](/packages/languages)                     | ISO 639-3 language code utilities             | [npm](https://www.npmjs.com/package/@colibri-hq/languages)           |

## Package Architecture

```
@colibri-hq/sdk
├── @colibri-hq/mobi
├── @colibri-hq/pdf
├── @colibri-hq/oauth
├── @colibri-hq/open-library-client
└── @colibri-hq/languages
```

The SDK is the main package that depends on the others. You can also use the sub-packages independently for specific
functionality.

## Installation

Install individual packages:

```bash
npm install @colibri-hq/sdk
npm install @colibri-hq/mobi
npm install @colibri-hq/open-library-client
```

## TypeScript Support

All packages include TypeScript type definitions and are written in TypeScript.

## Requirements

- Node.js 18+
- ESM modules (all packages are ESM-only)
