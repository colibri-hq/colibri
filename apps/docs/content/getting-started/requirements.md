---
title: Requirements
description: System requirements for running Colibri
date: 2024-01-01
order: 3
tags: [requirements, installation, operators, infrastructure]
relevance: 80
---

Understanding Colibri's system requirements helps you plan an appropriate deployment and ensures optimal performance for
your ebook library. This page outlines the hardware, software, network, and browser requirements necessary to run
Colibri successfully, whether you're deploying on a personal computer, home server, or cloud infrastructure.

Colibri has been designed to be relatively lightweight while providing robust functionality. The requirements vary
depending on your deployment method, library size, and usage patterns. This guide provides both minimum specifications
for basic functionality and recommended configurations for optimal performance, allowing you to make informed decisions
about your infrastructure.

## System Requirements

### Understanding Hardware Needs

The hardware resources required by Colibri depend primarily on your library size and the number of concurrent users. A
single-user deployment with a modest collection of a few hundred books can run comfortably on minimal hardware, while
larger household libraries with thousands of volumes and multiple simultaneous users benefit from more robust
specifications.

### Minimum Specifications

The minimum configuration represents the lowest-spec hardware capable of running Colibri acceptably for light,
single-user scenarios:

- **CPU: 2 Cores** - Colibri performs various compute-intensive operations including metadata extraction from ebook
  files, image processing for cover thumbnails, and concurrent queries to multiple metadata providers. A dual-core
  processor provides sufficient capability for these tasks when performed sequentially or with minimal concurrency.
  Modern ARM processors, such as those found in Raspberry Pi 4 devices, meet this requirement, making Colibri viable for
  low-power home server deployments.

- **RAM: 2GB** - This memory allocation supports the database, storage service, and web application components
  simultaneously with minimal overhead. The PostgreSQL database maintains query caches and working memory for
  transactions, while the application requires memory for request handling and temporary buffers during file uploads and
  metadata enrichment operations. With 2GB, the system can handle standard operations comfortably, though bulk imports
  or intensive metadata enrichment for many books simultaneously may experience some performance constraints.

- **Storage: 10GB plus library space** - The base Colibri installation, including the application, database, and system
  components, occupies approximately 5-10GB of disk space. Beyond this baseline, you'll need additional storage for your
  actual ebook collection, which varies dramatically based on your library size. EPUB files typically range from 1-5MB,
  MOBI files are similar, and PDF files can be substantially larger, especially for image-heavy or scanned content. A
  modest collection of 1,000 typical ebooks requires approximately 3-5GB of storage, while larger libraries with
  extensive PDF content may need considerably more.

- **Operating System** - Colibri runs on any platform that supports Docker, including Linux distributions, macOS, and
  Windows with WSL2 (Windows Subsystem for Linux). For non-containerized deployments, you'll need a Unix-like
  environment with support for Node.js and PostgreSQL.

### Recommended Specifications

For production deployment, larger libraries, or multi-user households, these enhanced specifications deliver notably
improved performance:

**CPU: 4+ Cores** - Additional processor cores enable true parallel execution of Colibri's various operations. During
metadata enrichment, the application queries multiple providers simultaneously, a workload that benefits substantially
from parallel processing. Cover image extraction and optimization for multiple books, concurrent user requests, and
background tasks all compete for CPU resources. With four or more cores, these operations can proceed without creating
bottlenecks that impact interactive responsiveness.

**RAM: 4GB+** - Doubling the memory allocation provides significant benefits across all components. PostgreSQL can
maintain larger caches, reducing disk I/O for frequently-accessed metadata. The application can handle more concurrent
requests without memory pressure, and operations like batch imports or intensive metadata enrichment can process larger
working sets without swapping. For libraries exceeding several thousand volumes, consider 8GB or more to maintain
optimal query performance.

**Storage: SSD with Adequate Capacity** - Solid-state storage dramatically improves database query performance and
reduces latency for file operations. While traditional spinning disks function acceptably, an SSD noticeably accelerates
database searches, metadata queries, and cover image loading. For library storage planning, calculate your requirements
based on current collection size and anticipated growth. A library of 5,000 mixed-format ebooks typically requires
15-25GB of storage, while collections heavy on PDF content or graphic novels may need substantially more.

**Operating System: Linux (Ubuntu 22.04+, Debian 12+)** - While Colibri runs on multiple platforms, Linux distributions
provide the most stable, performant, and well-tested deployment environment. Ubuntu LTS releases (22.04, 24.04) and
recent Debian stable versions offer excellent Docker support, straightforward administration, and broad community
resources for troubleshooting. These distributions also tend to receive the most testing from the Colibri development
community.

## Software Requirements

The software dependencies vary significantly based on your chosen deployment method. Colibri supports two primary
deployment approaches, each with different requirements.

### Docker Deployment (Recommended)

Docker provides the simplest and most reliable deployment path, bundling all dependencies into pre-configured containers
that eliminate compatibility issues and simplify upgrades.

**Docker 20.10+** - The containerization platform itself forms the foundation of this deployment method. Docker version
20.10 introduced several stability and security improvements that benefit Colibri's multi-container architecture. Newer
versions (23.0+) offer enhanced performance and additional features, though Colibri functions correctly with any version
from 20.10 onward.

**Docker Compose 2.0+** - The Compose tool orchestrates Colibri's multi-container deployment, managing service
dependencies, networking, and persistent storage volumes. Version 2.0 introduced a major rewrite with improved
performance and syntax. The included `docker-compose.yml` configuration file leverages Compose features to ensure
services start in the correct order and communicate properly.

Docker deployment abstracts away concerns about Node.js versions, PostgreSQL configuration, and system library
dependencies. The containers include pre-configured environments that have been tested to work reliably together, making
this approach ideal for users who want minimal complexity and maximum reliability.

### Development and Manual Installation

For contributors, developers, or users who prefer direct installation without containerization, these dependencies
provide the necessary runtime environment:

**Node.js 18+ (20+ Recommended)** - Colibri is built on modern JavaScript/TypeScript and requires Node.js for both the
build process and runtime execution. Version 18 represents the minimum supported version, providing the language
features and APIs that Colibri depends on. However, Node.js 20 LTS is strongly recommended for production deployments,
as it offers improved performance, better security, and longer support timelines. Version 22, the current major release,
also works well and may offer slight performance benefits.

**pnpm 8+** - Colibri uses pnpm as its package manager, leveraging its efficient storage model and excellent monorepo
support. Unlike npm or yarn, pnpm stores packages in a global store with symlinks to project dependencies, reducing disk
usage and installation time. Version 8 or later is required for compatibility with Colibri's workspace configuration and
lockfile format.

**PostgreSQL 15+** - The database engine stores all library metadata, user accounts, and structural information.
PostgreSQL 15 introduced performance improvements and features that Colibri utilizes, including optimizations for JSON
queries and enhanced full-text search capabilities. Version 16 or 17 (the current release) offer additional performance
improvements and are fully supported. The database should be configured with UTF-8 encoding to properly handle
international characters in book metadata.

**S3-Compatible Storage** - Colibri requires object storage for ebook files and cover images. Several options meet this
requirement:

- **MinIO**: An open-source, self-hosted S3-compatible object store perfect for local deployments. MinIO runs
  efficiently on the same hardware as Colibri and integrates seamlessly.
- **AWS S3**: Amazon's cloud object storage service provides durability and global availability, ideal for cloud
  deployments or when you want off-site storage redundancy.
- **Cloudflare R2**: Offers S3 compatibility with zero egress fees, making it cost-effective for frequently-accessed
  libraries.
- **Backblaze B2**: Another S3-compatible service with competitive pricing for storage and transfer.

The choice of storage backend depends on your priorities regarding cost, performance, data location, and redundancy
requirements. For self-hosted deployments, MinIO typically offers the best combination of simplicity and performance.

## Network Requirements

Colibri's network configuration determines how users access the service and how the application communicates with
external metadata providers.

**Port 3000: Web Interface** - By default, Colibri's web application listens on TCP port 3000 for incoming HTTP
connections. This port serves both the user interface and the API. While 3000 is the default, this is fully configurable
through environment variables, allowing you to choose any available port that suits your network setup. For production
deployments, you'll typically place a reverse proxy (nginx, Caddy, Traefik) in front of Colibri to provide HTTPS
encryption and custom domain mapping.

**Port 5432: PostgreSQL** - The database service listens on the standard PostgreSQL port. In Docker deployments, this
port is typically only exposed internally within the Docker network, preventing direct external access to the database
for security. If you're using an external PostgreSQL instance rather than the containerized database, ensure this port
is accessible from the Colibri application server.

**Port 9000: MinIO** - The object storage service exposes its API on port 9000 by default. Like the database port, this
is typically internal-only in Docker deployments. MinIO also provides a web management console on port 9001 (
configurable), useful for monitoring storage usage and managing buckets.

**Outbound Internet Access** - Colibri requires outbound connectivity to reach metadata providers during enrichment
operations. The application queries services including:

- Open Library (openlibrary.org)
- WikiData (wikidata.org)
- Library of Congress (loc.gov)
- Google Books (books.google.com)
- Internet Archive (archive.org)
- Various national library services

These connections use standard HTTPS (port 443) and can function through proxy servers if your network requires it. If
your deployment environment restricts outbound access, you can configure Colibri to operate without metadata enrichment,
though this eliminates one of its most valuable features.

For self-hosted deployments behind home firewalls, you don't need to expose Colibri directly to the internet. The
application only requires outbound connectivity for metadata enrichment—all user access can remain on your local
network. If you want to access your Colibri instance remotely, consider using a VPN rather than exposing the service
directly to the public internet, or implement proper security measures including HTTPS, strong authentication, and
firewall rules.

## Browser Support

Colibri's web interface leverages modern web standards to deliver a responsive, fast user experience. The application
requires a contemporary browser with support for current JavaScript features, WebAuthn for passwordless authentication,
and modern CSS capabilities.

**Chrome and Edge 90+** - Chromium-based browsers provide excellent support for all Colibri features, including Passkey
authentication, drag-and-drop file uploads, and the responsive interface. Version 90, released in 2021, established the
baseline feature set that Colibri relies on. Current versions (120+) offer optimal performance and security.

**Firefox 90+** - Mozilla's browser fully supports Colibri's interface and authentication requirements. Firefox's
WebAuthn implementation works reliably with Passkeys, and the browser handles Colibri's responsive design gracefully
across different screen sizes.

**Safari 15+** - Apple's browser introduced comprehensive WebAuthn support in version 15, making it suitable for
Colibri's Passkey authentication. Safari 15 arrived with iOS 15 and macOS Monterey, and later versions continue to
improve standards compliance and performance.

### Passkey Authentication Requirements

The WebAuthn standard, which underlies Colibri's Passkey authentication, requires specific browser capabilities:

**Public Key Cryptography**: All supported browsers implement the Web Authentication API, allowing them to create and
manage cryptographic key pairs for authentication. This enables the secure, password-less authentication that Colibri
employs.

**Platform Authenticators**: Modern devices include built-in authenticators—Touch ID and Face ID on Apple devices,
Windows Hello on Windows systems, fingerprint sensors on Android devices. Colibri's authentication works with these
platform authenticators, allowing users to sign in with a biometric gesture or device PIN.

**Cross-Platform Authenticators**: Hardware security keys like YubiKey also function with Colibri through the same
WebAuthn API, providing an alternative authentication method for users who prefer physical tokens.

The practical implication is that Colibri works smoothly on smartphones, tablets, laptops, and desktops manufactured
within the last several years. Very old devices may lack the necessary hardware authenticator support, though they can
often use security keys as an alternative.

## Performance Considerations

Beyond meeting the minimum requirements, several factors influence Colibri's real-world performance:

**Concurrent Users**: Each active user session consumes application resources for request handling and database queries.
The minimum specifications comfortably support 2-3 concurrent users performing typical operations. For households with
more active users or if you experience performance issues, increasing CPU and RAM allocations provides noticeable
benefits.

**Library Size**: Database query performance degrades gradually as your library grows into tens of thousands of items.
PostgreSQL's query optimizer handles this well, but very large collections (20,000+ books) benefit from increased memory
allocation for database caching and faster storage for index operations.

**Metadata Enrichment Intensity**: When enriching multiple books simultaneously, Colibri makes numerous concurrent HTTP
requests to external services. This is CPU-intensive for parsing responses and memory-intensive for maintaining multiple
pending requests. If you frequently perform bulk enrichment operations, the recommended specifications deliver
substantially better throughput.

**Storage Performance**: Database queries and file serving both benefit from fast storage. An SSD reduces page load
times, accelerates search results, and improves the responsiveness of cover image loading. For libraries where storage
performance matters but cost is a concern, consider placing just the PostgreSQL data directory on SSD while using
cheaper spinning disk storage for the actual ebook files.

## Deployment Environment Recommendations

Different deployment scenarios have different optimal configurations:

**Personal Library on Desktop**: If you run Colibri on a personal computer alongside other applications, the minimum
specifications typically suffice. Use the Docker deployment for simplicity and ensure you allocate at least 2GB of RAM
to Docker's resource limits.

**Dedicated Home Server**: For a dedicated device like a Raspberry Pi 4, NUC, or similar hardware, the recommended
specifications provide headroom for reliable operation. A 4-core ARM or x86 processor with 4-8GB RAM handles multi-user
household deployments comfortably.

**Cloud VPS**: When deploying on cloud infrastructure like DigitalOcean, Linode, or AWS EC2, choose instances with at
least 2 vCPUs and 4GB RAM. The equivalent tiers (often called "standard" or "general purpose") provide balanced CPU and
memory appropriate for Colibri's workload. Ensure you provision adequate storage volumes for your anticipated library
size.

**Network-Attached Storage (NAS)**: Many modern NAS devices from Synology, QNAP, and similar manufacturers support
Docker containers. If your NAS meets the CPU and RAM requirements, it can serve as an excellent Colibri host, leveraging
the NAS's existing storage infrastructure for your ebook collection.

## Preparing for Installation

With an understanding of these requirements, you're ready to proceed with installation. Verify that your target
deployment environment meets or exceeds the specifications outlined here, particularly:

- Hardware resources (CPU, RAM, storage) match or exceed minimum requirements, ideally approaching recommended
  specifications
- Docker and Docker Compose are installed and functional if using containerized deployment
- Network ports are available and firewall rules permit necessary connections
- You can access the system via a supported web browser with WebAuthn capabilities

The [Quick Start](/getting-started/quick-start) guide provides step-by-step instructions for the Docker-based
installation path, which works reliably across all supported platforms. For development environments or specialized
deployments, the [Full Installation Guide](/setup/installation) covers manual installation procedures and advanced
configuration options.
