---
title: Quick Start
description: Get Colibri running in 5 minutes
date: 2024-01-01
order: 2
tags: [installation, docker, beginners, guide]
relevance: 95
---

# Quick Start

This guide will walk you through the fastest path to getting your own Colibri instance up and running. Using Docker Compose, you can have a fully functional ebook library application operational in just a few minutes, complete with database, storage, and the web application itself. This containerized deployment approach eliminates the complexity of manual dependency installation and configuration, making it ideal for both initial evaluation and production deployment.

Whether you're exploring Colibri for the first time or setting up a permanent instance for your household library, this quick start provides everything you need to begin managing your ebook collection immediately. Once the basic installation is complete, you'll be ready to upload books, enrich metadata, create collections, and explore the full range of Colibri's capabilities.

## Prerequisites

Before beginning the installation process, ensure that your system has the following software installed and properly configured:

**Docker and Docker Compose** form the foundation of the containerized deployment. You'll need Docker version 20.10 or later, along with Docker Compose 2.0 or higher. If you haven't installed Docker yet, comprehensive installation guides are available at [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) for all major operating systems including Windows, macOS, and Linux distributions.

**Git** is required to clone the Colibri repository and retrieve the necessary configuration files. Most modern operating systems include Git by default, but if you need to install it, visit [git-scm.com](https://git-scm.com/) for platform-specific instructions.

**System Resources**: Verify that your system has at least 2GB of available RAM for the Colibri services to run comfortably. While the application can function with less memory, allocating adequate resources ensures smooth operation, particularly during metadata enrichment operations that query multiple external services simultaneously.

With these prerequisites satisfied, you're ready to proceed with the installation.

## Installation Steps

### Step 1: Clone the Repository

Begin by obtaining the Colibri source code from the official repository. Open a terminal or command prompt and execute the following commands:

```bash foo=bar
git clone https://github.com/colibri-hq/colibri.git
cd colibri
```

This retrieves the complete Colibri codebase and navigates into the project directory. The repository includes not only the application source but also Docker configuration files, database schema definitions, and example configuration that will be used in subsequent steps.

The cloning process typically completes in less than a minute, depending on your internet connection speed. Once finished, you'll have a local copy of the entire Colibri project ready for deployment.

### Step 2: Launch with Docker Compose

The Docker Compose configuration orchestrates the deployment of all required services in properly configured containers. From within the `colibri` directory, start the application stack with:

```bash
docker-compose up -d
```

The `-d` flag runs the containers in detached mode, allowing them to operate in the background while you continue working in your terminal. During the initial launch, Docker will download the necessary container images, which may take several minutes depending on your internet connection speed.

This single command provisions and launches three essential services that work together to provide the complete Colibri experience:

**PostgreSQL Database** serves as the metadata repository, storing information about your books, authors, publishers, collections, user accounts, and all other structured data. The database is automatically initialized with the appropriate schema during the first launch, creating all necessary tables and relationships.

**MinIO Storage** provides S3-compatible object storage for your ebook files, cover images, and other binary assets. This component allows Colibri to store large files efficiently while maintaining compatibility with the widely-adopted S3 API, making it easy to migrate to cloud storage providers if desired.

**Colibri Web Application** is the user-facing interface where you'll interact with your library. Built on SvelteKit, this component serves both the web interface and the API that powers it, providing a responsive, modern experience across desktop and mobile devices.

The containers are configured to restart automatically, ensuring that your Colibri instance remains available even after system reboots.

### Step 3: Access the Application

Once the containers have started—typically within 30-60 seconds of launching the stack—you can access Colibri through your web browser. Navigate to:

```
http://localhost:3000
```

This URL connects to the Colibri web application running in its Docker container. You should see the Colibri login page, featuring the application logo and options for authentication. If you encounter connection errors, wait a few moments for the application to complete its initialization process, then refresh the page.

The localhost address works for accessing Colibri from the same machine where it's running. If you want to access your instance from other devices on your network, you'll use your server's IP address instead (for example, `http://192.168.1.100:3000`). For information about configuring custom domains and HTTPS, consult the full installation guide.

### Step 4: Create Your First Account

Colibri uses passwordless authentication via Passkeys, providing both enhanced security and improved convenience compared to traditional password-based systems. Creating your first account establishes you as the administrator of this Colibri instance, granting full access to all features and settings.

On the login page, locate and click the **Create Account** button. You'll be presented with a registration form requesting basic information.

**Enter Your Email Address**: Provide a valid email address that will serve as your account identifier. While Colibri doesn't send emails in the default configuration, your email address provides a recognizable account name and can be used for notifications if you configure email services later.

**Set Up a Passkey**: The system will prompt you to create a Passkey for secure authentication. This process varies slightly depending on your device and browser, but typically involves one of the following:

- **Biometric authentication** using fingerprint or facial recognition on devices with these capabilities
- **Security key** if you have a hardware token like a YubiKey
- **Device PIN** as an alternative authentication method

Follow the prompts provided by your browser to complete the Passkey creation. Modern browsers guide you through this process intuitively, and the entire setup takes only a few seconds. Once complete, you'll be able to sign in to your Colibri instance instantly using your biometric or security key—no passwords to remember or type.

**Welcome to Your Library**: Upon successful account creation, you'll be automatically signed in and presented with your empty library. The interface displays a sidebar with navigation options, a main content area showing your books (currently empty), and an upload button ready for your first ebook.

## Adding Your First Book

With your account created and Colibri ready, you can immediately begin building your library. The upload process has been designed to be both simple for basic use and powerful for those who want comprehensive metadata.

**Initiate the Upload**: Click the **Upload** button prominently displayed in the sidebar. This opens the upload interface, which accepts ebook files through drag-and-drop or traditional file selection.

**Select Your Ebook**: Drag an EPUB, MOBI, or PDF file from your file manager and drop it onto the upload area. Alternatively, click the upload area to open a file browser where you can navigate to and select your ebook file. Colibri accepts individual files or multiple files simultaneously, making it easy to import several books at once.

**Automatic Metadata Extraction**: As soon as you drop the file, Colibri begins analyzing it to extract embedded metadata. For EPUB and MOBI files, this includes information stored in the ebook's manifest—title, author names, publisher, publication date, ISBN, language, and other standard bibliographic fields. The system also extracts the cover image if one is embedded in the file.

Within seconds, you'll see a preview of the extracted information displayed in the upload interface. This gives you an immediate view of what Colibri found in your file and serves as the starting point for further enrichment.

**Enrich with External Metadata**: To enhance the basic extracted data with professional-quality bibliographic information, click the **Enrich Metadata** button. This triggers Colibri's metadata enrichment system, which queries multiple authoritative sources including Open Library, WikiData, the Library of Congress, and Google Books.

The enrichment process typically completes in a few seconds, after which you'll see enhanced metadata including:

- Professional author information with birth/death dates, nationalities, and biographies
- Detailed publication information including publisher details and edition specifics
- Subject classifications and genre tags from library cataloging systems
- Series information if the book is part of a multi-volume work
- High-resolution cover artwork from professional sources
- Additional identifiers like OCLC numbers and Library of Congress Control Numbers

**Review and Accept**: Colibri presents enrichment suggestions in a clear interface that shows both the original metadata and proposed changes. Each field displays the confidence score for the suggestion, helping you understand how certain the system is about each piece of information. Review the suggestions and accept the changes that appear accurate—you can always edit metadata later if needed.

**Save Your Book**: After reviewing and accepting metadata, click the **Save** button to add the book to your library permanently. The file is uploaded to storage, metadata is committed to the database, and your book appears in the main library view, complete with cover thumbnail and all bibliographic information.

Congratulations! You've successfully added your first book to Colibri and experienced the core workflow of upload, extraction, enrichment, and review. This same process scales effortlessly whether you're adding one book or importing an entire collection.

## Exploring Your Library

With your first book added, take some time to explore the interface and discover Colibri's organizational features:

**Browse Your Collection**: The main library view displays your books in a responsive grid or list layout. Click any book to view its detailed information page, which shows the complete metadata, cover image, and options for downloading, editing, or adding to collections.

**Create Collections**: Use collections to organize books into reading lists, genre categories, or any grouping that makes sense for your library. Click the collections icon in the sidebar to create your first collection, give it a name and description, then add books by dragging them into the collection or using the collection selector on each book's detail page.

**Search Your Library**: As your collection grows, the search functionality becomes increasingly valuable. The search box at the top of the interface finds books by title, author, publisher, ISBN, or any other metadata field, delivering instant results even across large libraries.

**Manage Settings**: Click the settings icon to explore configuration options including instance settings, user management, metadata provider preferences, and display customization. As the administrator, you have full control over how your Colibri instance operates.

## What's Next

You now have a functioning Colibri instance ready to serve as your personal ebook library. This quick start has covered the essential installation and initial usage, but Colibri offers much more depth for those who want to explore further.

**Comprehensive Configuration**: The [Full Installation Guide](/setup/installation) provides detailed information about advanced deployment scenarios, custom configuration options, and integration with existing infrastructure. Learn about configuring external S3 storage, setting up reverse proxies for HTTPS access, and customizing the application to match your specific requirements.

**Instance Customization**: The [Configuration Guide](/setup/configuration) explains all available settings for tuning Colibri's behavior. Discover how to configure metadata provider preferences, customize the metadata enrichment workflow, adjust storage paths, and enable optional features.

**Feature Exploration**: The [User Guide](/user-guide) offers comprehensive documentation of every Colibri feature, from basic library management to advanced capabilities like series management, tag systems, and multi-user household libraries. Learn tips and tricks for organizing large collections efficiently.

**CLI Power Tools**: For users comfortable with command-line interfaces, the CLI documentation explains how to use Colibri's command-line tools for automation, bulk operations, and integration with scripts. Discover how to import hundreds of books at once, automate metadata enrichment, and manage your library programmatically.

**Metadata Fine-Tuning**: Understanding how Colibri's metadata enrichment system works allows you to get the best results for your specific collection. Learn about confidence scoring, conflict resolution, and how to configure provider priorities for optimal results with your particular genre preferences.

Your journey with Colibri is just beginning. Whether you maintain a small personal collection or manage a household library with thousands of volumes, Colibri provides the tools and intelligence to create a well-organized, richly catalogued ebook collection that respects your privacy while delivering the convenience of modern cloud services.
