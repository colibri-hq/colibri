---
title: Introduction to Colibri
description: Learn what Colibri is and what it can do for your ebook library
date: 2024-01-01
order: 1
tags: [overview, beginners, ebooks, self-hosted, privacy]
relevance: 90
---

# Introduction to Colibri

Welcome to Colibri, a comprehensive self-hosted ebook library application designed for readers who value both privacy and control over their digital book collections. Built with modern web technologies and a focus on user experience, Colibri provides a seamless, feature-rich platform for organizing, discovering, and managing ebooks across multiple formats including EPUB, MOBI, and PDF.

At its core, Colibri addresses a fundamental challenge faced by digital book enthusiasts: how to maintain a well-organized, richly catalogued library without relying on proprietary cloud services or surrendering control of personal data. By hosting your own instance, you gain complete ownership of your library metadata, reading history, and personal annotations while enjoying the convenience of modern web-based book management.

## What Makes Colibri Different

Colibri distinguishes itself through its commitment to metadata excellence and intelligent automation. Unlike simple file storage solutions, Colibri actively enhances your library by connecting to over fourteen authoritative metadata providers—including Open Library, WikiData, the Library of Congress, and Google Books—to automatically enrich your collection with professional-grade bibliographic information. This automated enrichment transforms a basic collection of files into a professionally curated library with accurate author information, publication details, cover artwork, and subject classifications.

The application employs sophisticated reconciliation algorithms with confidence scoring to ensure that metadata suggestions are accurate and relevant. When multiple sources provide conflicting information, Colibri's intelligent system weighs the reliability of each source and presents you with the most trustworthy data. You remain in control, however, with the ability to review, accept, or reject any suggested changes to your library's metadata.

## Who Colibri Is For

Colibri is designed for a diverse range of users, from individual readers managing personal collections to families sharing a household library. The application excels in several key scenarios:

**Digital Library Enthusiasts** who have accumulated extensive ebook collections across various sources will appreciate Colibri's ability to unify and organize disparate files into a coherent, searchable library. The automatic metadata extraction and enrichment features save countless hours of manual cataloguing while ensuring professional-quality bibliographic records.

**Privacy-Conscious Readers** who prefer to keep their reading habits and library contents private will value Colibri's self-hosted architecture. By running your own instance, you ensure that your reading data never leaves your control, avoiding the tracking and data collection inherent in many commercial ebook platforms.

**Families and Households** benefit from Colibri's role-based access control, which supports admin, adult, and child user roles. This allows parents to manage a shared family library while maintaining appropriate content boundaries and providing age-appropriate access to younger readers.

**Technology Enthusiasts and Tinkerers** will find Colibri's open architecture and comprehensive CLI tools perfect for automation, scripting, and integration with other home server applications. The monorepo structure and well-documented codebase make customization and extension straightforward for those with development skills.

## Core Capabilities

### Comprehensive Ebook Management

Colibri provides full-featured management for the three most common ebook formats: EPUB, MOBI, and PDF. The application automatically extracts embedded metadata during upload, including title, author, publication date, ISBN, cover images, and other bibliographic information. This initial extraction serves as the foundation for further enrichment, ensuring that even books from sources without rich metadata start with accurate basic information.

Cover image processing receives special attention in Colibri. The system automatically extracts cover artwork from uploaded files, optimizes images for web display, and generates responsive thumbnails for grid and list views. When enriching metadata, Colibri can also fetch higher-quality cover images from external sources, replacing low-resolution embedded covers with professional artwork suitable for large displays.

### Intelligent Metadata Enrichment

The metadata enrichment system represents one of Colibri's most powerful features. By querying multiple authoritative sources simultaneously, the application can transform basic ebook files into fully catalogued library items with comprehensive bibliographic data. The system connects to fourteen distinct metadata providers, each offering unique strengths:

**Open Library** provides extensive coverage of both popular and obscure titles, with particular strength in English-language fiction and recent publications. **WikiData** offers structured data about books, authors, publishers, and series relationships, with excellent international coverage. The **Library of Congress** contributes authoritative cataloguing information and subject headings. **Google Books** adds publisher data, detailed descriptions, and preview information for millions of titles.

Additional providers include the Internet Archive, ISNI (International Standard Name Identifier) for author disambiguation, VIAF (Virtual International Authority File) for authoritative name forms, and specialized sources like CrossRef for academic works, DOAB for open-access books, and national libraries including the British National Bibliography and Deutsche Nationalbibliothek.

The reconciliation engine evaluates responses from all providers, assigning confidence scores based on data quality, source authority, and consistency across providers. When conflicts arise, the system presents options clearly, allowing you to make informed decisions about which data to trust. This human-in-the-loop approach ensures accuracy while leveraging automation for efficiency.

### Organizational Tools

Colibri provides flexible organizational tools to help you structure your library according to your preferences. The **collections** feature allows you to create custom groupings for reading lists, genre classifications, or any other categorization scheme you prefer. Collections can be public or private, and books can belong to multiple collections simultaneously, providing the flexibility to organize the same content in multiple ways.

**Series support** recognizes and preserves the relationships between books in multi-volume works. The system automatically detects series information during metadata enrichment and maintains proper ordering, making it easy to track your progress through long-running series and discover new installments.

A comprehensive **tagging system** supplements collections with lightweight, ad-hoc categorization. Tags can represent any concept you choose—themes, genres, reading status, locations, or personal ratings—providing unlimited flexibility for organizing and filtering your library according to your evolving needs.

**Full-text search** capabilities allow you to quickly locate books by title, author, publisher, ISBN, or any other metadata field. The search system indexes your entire library, making it instant to find specific items even in collections containing thousands of volumes.

### Security and Privacy

Security architecture in Colibri emphasizes both strong authentication and user privacy. The application implements **passwordless authentication** using Passkeys (WebAuthn), a modern standard that provides security superior to traditional passwords while offering improved usability. Passkeys use public-key cryptography and biometric verification, making them resistant to phishing, credential stuffing, and other common attack vectors.

The **self-hosted deployment model** ensures complete data sovereignty. Your library metadata, user information, reading history, and all other data resides exclusively on infrastructure you control. This architecture eliminates third-party tracking, prevents unauthorized data mining, and gives you full authority over backup, retention, and privacy policies.

**Role-based access control** supports household deployment with three distinct user roles. Administrators have full system access and configuration capabilities. Adult users can access the complete library and manage their own collections. Child users receive filtered access appropriate for younger readers, with parents maintaining control over which content appears in their interface.

## Technical Foundation

Colibri's architecture reflects modern web development best practices, built as a monorepo containing multiple interconnected components. The **web application**, constructed with SvelteKit, provides a responsive, fast interface that works seamlessly across desktop and mobile devices. The **tRPC API** layer ensures type-safe communication between client and server, catching potential integration errors at compile time rather than runtime.

The **CLI tool** offers power users and system administrators a scriptable interface for automation, bulk operations, and integration with other tools. Whether you need to import hundreds of books programmatically, automate metadata enrichment on a schedule, or integrate Colibri with existing digital asset management workflows, the CLI provides the necessary capabilities.

The **SDK package** contains core functionality including database operations, ebook parsing, storage management, and metadata provider integrations. This modular design allows developers to extend Colibri or integrate its capabilities into other applications while maintaining clean separation of concerns.

A reusable **UI component library** built on Svelte ensures consistent design and behavior across the application while making it easier for contributors to develop new features that feel native to the existing interface.

## Design Philosophy

Colibri's development follows several guiding principles that inform feature decisions and implementation choices:

**User Sovereignty**: You should own and control your data completely. Colibri never phones home, doesn't include telemetry, and stores all data in standard, portable formats that prevent lock-in.

**Metadata Excellence**: A well-catalogued library is more valuable than a pile of files. Colibri invests heavily in metadata quality, employing multiple sources and intelligent reconciliation to ensure your library contains accurate, comprehensive bibliographic information.

**Progressive Enhancement**: Basic functionality should work immediately while advanced features remain discoverable. Colibri focuses on making common tasks effortless while providing depth for users who want to explore advanced capabilities.

**Standards Compliance**: Wherever possible, Colibri adopts and adheres to industry standards for ebook formats, authentication, API design, and data interchange. This commitment to standards ensures compatibility, security, and long-term maintainability.

**Extensibility**: The open architecture and comprehensive API make it straightforward to extend Colibri's capabilities, integrate with other services, or customize behavior to meet specific needs.

## Getting Started

Ready to experience the future of self-hosted ebook management? The [Quick Start](/getting-started/quick-start) guide will have you up and running with your own Colibri instance in minutes. If you'd like to understand the technical requirements first, consult the [Requirements](/getting-started/requirements) page for detailed system specifications.

Whether you're migrating from a commercial ebook service, organizing an existing collection, or starting fresh with a new library, Colibri provides the tools, intelligence, and flexibility to create a book collection that reflects your personal interests and organizational preferences while respecting your privacy and autonomy.
