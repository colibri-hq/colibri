> **GitHub Issue:** [#126](https://github.com/colibri-hq/colibri/issues/126)

# Documentation Content Strategy

## Overview

This plan focuses on the **content strategy** for Colibri's documentation website, separate from technical implementation. The goal is to make Colibri accessible and appealing to book enthusiasts of all technical levels, from casual readers to advanced self-hosters, while maintaining the platform's positioning as a top-tier digital library solution.

## Target Audiences

### Primary Audiences

#### 1. **Book Enthusiasts (Non-Technical)**

**Characteristics:**

- Passionate about reading and organizing their collection
- May have 50-500+ ebooks from various sources
- Limited technical knowledge (comfortable with apps, not servers)
- Values privacy but intimidated by self-hosting
- Looking for alternatives to Goodreads, Kindle ecosystem

**Content Needs:**

- Simple, jargon-free language
- Visual walkthroughs and screenshots
- Clear explanations of benefits vs. commercial platforms
- Reassurance about ease of use
- "What happens if..." scenarios

**Success Metrics:**

- Can understand what Colibri does in <2 minutes
- Feels confident they could set it up (even if they don't)
- Understands privacy benefits without technical details

#### 2. **Home Lab Enthusiasts (Technical)**

**Characteristics:**

- Already self-hosting services (Plex, Home Assistant, etc.)
- Comfortable with Docker, command line basics
- Has 500-5000+ ebooks
- Values control, automation, and integration
- Active in r/selfhosted, r/datahoarder communities

**Content Needs:**

- Quick setup guides (Docker Compose preferred)
- Integration examples with existing infrastructure
- API documentation for automation
- Performance considerations for large libraries
- Migration guides from Calibre

**Success Metrics:**

- Can deploy Colibri in <30 minutes
- Finds all configuration options documented
- Can integrate with existing tools (Plex, Jellyfin, etc.)

#### 3. **Families & Shared Libraries**

**Characteristics:**

- 2-6 users sharing a household library
- Mix of technical levels among family members
- Need age-appropriate content filtering
- Want individual reading lists/collections
- May have 100-1000 books

**Content Needs:**

- User management documentation
- Parental control explanations
- Collection sharing features
- Multi-user workflow examples
- Child account setup guides

**Success Metrics:**

- Can set up family accounts in <10 minutes
- Understands privacy/sharing controls
- Kids can use the interface independently

#### 4. **Privacy-Conscious Users**

**Characteristics:**

- Actively avoiding big tech platforms
- May use VPN, encrypted services
- Concerned about reading habit tracking
- Values open-source software
- Willing to learn technical skills for privacy

**Content Needs:**

- Clear privacy guarantees
- Self-hosting benefits explained
- No telemetry/tracking proof
- Data portability documentation
- Security best practices

**Success Metrics:**

- Trusts Colibri with sensitive reading data
- Understands where data is stored
- Can verify privacy claims

### Secondary Audiences

#### 5. **Developers & Contributors**

**Content Needs:**

- Architecture documentation
- API references
- Contributing guidelines
- Code examples and patterns

#### 6. **Academic/Research Users**

**Content Needs:**

- Citation management
- Tagging and organization for research
- Bulk import capabilities
- Export formats (BibTeX, etc.)

## Content Principles

### 1. **Progressive Disclosure**

Start simple, reveal complexity gradually:

- Homepage: What is Colibri in 30 seconds
- Getting Started: Install and upload first book
- User Guide: Discover advanced features
- CLI/API: Power user capabilities

### 2. **Show, Don't Tell**

Prioritize visual content:

- Screenshots > text descriptions
- Annotated images > long explanations
- Video walkthroughs > written steps
- Real examples > abstract concepts

### 3. **Empathy-Driven Language**

Address user fears and questions:

- "You don't need to be technical to use Colibri"
- "Your data never leaves your server"
- "If something breaks, here's how to fix it"
- "This will take about 5 minutes"

### 4. **Respect User Intelligence**

Don't oversimplify or condescend:

- Explain "why" not just "how"
- Link to deeper explanations
- Acknowledge tradeoffs honestly
- Use technical terms with definitions

### 5. **Accessibility First**

Ensure content works for everyone:

- Alt text for all images
- Keyboard navigation documented
- Mobile-friendly layouts
- Screen reader compatible

## Content Types & Formats

### 1. **Getting Started Content**

#### **Introduction Page**

**Format:** Landing page with video + text
**Length:** 2-3 minute read
**Elements:**

- Hero video (30-60 seconds) showing Colibri in action
- 3-4 key benefits with icons
- "Who is Colibri for?" section
- Comparison table (vs. Calibre, Goodreads, Kindle)
- CTA to Quick Start guide

#### **Quick Start Guide**

**Format:** Step-by-step tutorial
**Length:** 5-10 minutes to complete
**Elements:**

- Prerequisites checklist
- Video walkthrough (embedded YouTube)
- Copy-paste commands
- Expected output examples
- "What to do if..." troubleshooting
- Next steps (upload first book)

#### **Requirements Page**

**Format:** Technical specifications
**Length:** Quick reference
**Elements:**

- System requirements (RAM, disk, CPU)
- Software dependencies
- Supported platforms (Linux, macOS, Windows via WSL)
- Optional vs. required components
- Minimum vs. recommended specs

### 2. **User Guide Content**

#### **Visual Walkthroughs**

**Format:** Screenshot-heavy guides
**Requirements:**

- Annotated screenshots with numbered callouts
- Before/after comparisons
- Mobile + desktop views
- Dark mode examples
- Accessible alt text

**Topics to Cover:**

- [ ] Library Management
  - [ ] Grid vs. list view comparison
  - [ ] Filtering and sorting interface
  - [ ] Work detail page walkthrough
- [ ] Uploading Books
  - [ ] Drag-and-drop demonstration
  - [ ] Upload progress indicators
  - [ ] Duplicate detection in action
- [ ] Metadata Enrichment
  - [ ] Before: sparse metadata
  - [ ] After: enriched metadata
  - [ ] Manual enrichment flow
  - [ ] Confidence score interpretation
- [ ] Collections
  - [ ] Creating a collection
  - [ ] Adding books to collections
  - [ ] Public vs. private collections
- [ ] Search & Discovery
  - [ ] Basic search
  - [ ] Advanced filters
  - [ ] Search results page

#### **Task-Based Tutorials**

**Format:** How-to guides
**Structure:**

1. Goal statement ("By the end of this guide, you'll...")
2. Prerequisites
3. Step-by-step instructions
4. Verification step
5. Next steps/related guides

**Priority Tasks:**

- [ ] Upload your first book
- [ ] Organize books into collections
- [ ] Find and download a book
- [ ] Set up family accounts
- [ ] Import Calibre library
- [ ] Configure metadata providers
- [ ] Set up Passkey authentication

### 3. **Video Content**

#### **Video Guidelines**

**Length:** 2-5 minutes per video
**Style:** Screen recording + voiceover
**Quality:** 1080p minimum
**Platform:** YouTube (embedded in docs)
**Accessibility:** Subtitles required

#### **Priority Videos**

**High Priority (Create ASAP when app is stable):**

1. **"What is Colibri?"** (60 seconds)
   - Quick overview for homepage
   - Show off UI beauty
   - Highlight key differentiators

2. **"Getting Started in 5 Minutes"** (5 minutes)
   - Docker Compose installation
   - First login
   - Upload first book
   - Basic navigation

3. **"Your First Upload"** (3 minutes)
   - Drag and drop demo
   - Metadata extraction
   - Manual enrichment
   - Downloading the book

**Medium Priority:** 4. **"Organizing with Collections"** (4 minutes) 5. **"Understanding Metadata Enrichment"** (4 minutes) 6. **"Setting Up Family Accounts"** (3 minutes) 7. **"Migrating from Calibre"** (6 minutes)

**Lower Priority:** 8. **"CLI Power User Guide"** (10 minutes) 9. **"Advanced Search Techniques"** (4 minutes) 10. **"Troubleshooting Common Issues"** (5 minutes)

### 4. **Use Case Content**

#### **"Use Case" Pages**

**Format:** Persona-based scenarios
**Structure:**

1. Meet [Persona Name]
2. Their challenge
3. How Colibri solves it
4. Specific features they use
5. Result/outcome

**Personas to Create:**

**1. Sarah - The Casual Reader**

- **Profile:** Reads 20-30 books/year, uses Kindle but frustrated by ecosystem lock-in
- **Challenge:** Wants to organize personal EPUB collection from various sources
- **Solution:** Colibri's simple upload + auto-metadata enrichment
- **Features:** Upload, collections, search
- **Outcome:** Organized library, accessible on all devices

**2. Marcus - The Book Collector**

- **Profile:** 2,000+ ebooks, meticulous about organization
- **Challenge:** Calibre is powerful but dated, wants modern web interface
- **Solution:** Colibri's metadata excellence + beautiful UI
- **Features:** Metadata enrichment, advanced search, CLI for bulk operations
- **Outcome:** Professional-grade catalog, beautiful interface

**3. The Chen Family**

- **Profile:** Parents + 2 kids (ages 8 and 12), 500 books
- **Challenge:** Need shared family library with age-appropriate controls
- **Solution:** Colibri's role-based access + collections
- **Features:** User roles, private collections, reading lists
- **Outcome:** Kids have curated access, parents manage content

**4. Alex - The Privacy Advocate**

- **Profile:** Self-hosts services, avoids big tech
- **Challenge:** Goodreads tracks everything, Kindle phones home
- **Solution:** Colibri's self-hosted, no-telemetry architecture
- **Features:** Complete data ownership, Passkey auth, OPDS support
- **Outcome:** Private reading habits, no tracking

**5. Dr. Rivera - The Academic Researcher**

- **Profile:** University professor, 500+ academic texts
- **Challenge:** Needs organized research library with citations
- **Solution:** Colibri's tagging + export features
- **Features:** Advanced tagging, BibTeX export, CLI automation
- **Outcome:** Organized research library, easy citations

### 5. **Comparison Content**

#### **Platform Comparisons**

**Format:** Side-by-side tables + narrative

**Priority Comparisons:**

**1. Colibri vs. Calibre**
| Feature | Colibri | Calibre |
|---------|---------|---------|
| Interface | Modern web UI | Desktop app (Qt) |
| Metadata | 14+ providers, auto-enrichment | Manual + limited auto |
| Mobile Access | Native web (any browser) | Requires Calibre Web |
| Multi-user | Built-in roles | Single user |
| Privacy | Self-hosted, no tracking | Desktop app, private |
| Format Support | EPUB, MOBI, PDF | 20+ formats |
| Best For | Web-first users, families | Power users, format conversion |

**2. Colibri vs. Goodreads**
| Feature | Colibri | Goodreads |
|---------|---------|---------|
| Data Ownership | You own everything | Amazon owns your data |
| Privacy | No tracking | Extensive tracking |
| Library Management | Full ebook management | Reading list only |
| Social Features | Coming soon | Extensive |
| Access | Self-hosted | Cloud |
| Cost | Free (hosting costs) | Free (data is product) |
| Best For | Privacy-conscious readers | Social readers |

**3. Self-Hosted vs. Cloud Libraries**
| Aspect | Self-Hosted (Colibri) | Cloud (Kindle, etc.) |
|--------|----------------------|---------------------|
| Privacy | Complete | Limited |
| Ownership | Forever yours | Until service ends |
| Customization | Unlimited | None |
| Accessibility | Requires server | Anywhere |
| Setup | Technical (1 hour) | Instant |
| Cost | Hosting (~$5-20/mo) | Free or subscription |
| DRM | Must remove before import | Built-in |
| Best For | Control enthusiasts | Convenience seekers |

### 6. **FAQ Content**

#### **Frequently Asked Questions**

**Organization:** By topic, searchable

**General Questions:**

- What is Colibri?
- Is Colibri free?
- Do I need technical skills to use Colibri?
- How is Colibri different from Calibre?
- Can I try Colibri without self-hosting?

**Setup & Installation:**

- What are the system requirements?
- Can I run Colibri on Windows?
- How much does it cost to host?
- Do I need a domain name?
- Can I install on a Raspberry Pi?
- How long does setup take?

**Privacy & Security:**

- Is my data private?
- Does Colibri track my reading?
- What data is stored?
- Can others access my library?
- How secure is Passkey authentication?
- Can I use Colibri offline?

**Features & Functionality:**

- What ebook formats are supported?
- Can I read books directly in Colibri? (future feature)
- How does metadata enrichment work?
- Can I import from Calibre/Goodreads?
- Does Colibri support audiobooks?
- Can I share books with friends?

**Library Management:**

- How many books can Colibri handle?
- Can I organize books into collections?
- Does Colibri support series?
- Can I rate and review books?
- How do I add missing metadata?

**Technical Questions:**

- What database does Colibri use?
- Can I backup my library?
- How do I update Colibri?
- Can I use my own S3 storage?
- Is there a CLI?
- Can I automate uploads?

### 7. **Migration Guides**

#### **Calibre to Colibri**

**Format:** Step-by-step guide
**Estimated Time:** 30-60 minutes
**Prerequisites:** Existing Calibre library

**Steps:**

1. Export Calibre library metadata
2. Locate Calibre library folder
3. Prepare Colibri instance
4. Import books via CLI
5. Verify metadata transfer
6. Handle discrepancies
7. Set up new workflow

**2. Goodreads to Colibri**
**Format:** Import guide
**Estimated Time:** 15-30 minutes

**Steps:**

1. Export Goodreads library (CSV)
2. Parse Goodreads data
3. Match books to your ebook files
4. Import with metadata
5. Set up reading status/collections

**3. Kindle to Colibri**
**Format:** Migration guide with DRM considerations
**Estimated Time:** Variable

**Important Note:**

- Address DRM removal ethics
- Link to legal resources
- Emphasize personal use only
- Provide alternative: purchase DRM-free

### 8. **Glossary & Learning Resources**

#### **Glossary Page**

**Format:** Alphabetical reference with search
**Interactive:** Hover tooltips throughout docs

**Terms to Define:**

**Ebook Concepts:**

- EPUB, MOBI, PDF (format differences)
- ISBN (why it matters)
- Metadata (what and why)
- DRM (Digital Rights Management)
- OPDS (Open Publication Distribution System)
- Catalog (vs. library)

**Technical Concepts:**

- Self-hosting (what it means)
- Instance (your Colibri installation)
- Database (PostgreSQL)
- S3 Storage (object storage)
- Docker (containerization)
- Environment variables
- API (Application Programming Interface)
- CLI (Command Line Interface)

**Colibri-Specific:**

- Work (abstract book concept)
- Edition (specific publication)
- Asset (ebook file)
- Confidence score (metadata quality)
- Enrichment (fetching metadata)
- Collection (user-created group)
- Passkey (authentication method)

## Content Calendar & Phases

### Phase 1: Foundation (Before Public Launch)

**Goal:** Essential content for users to get started
**Timeline:** Complete before v1.0 release

**Must-Have Content:**

- [x] Introduction (completed)
- [ ] Quick Start with video
- [x] Requirements (completed)
- [ ] Installation guide with screenshots
- [ ] First upload tutorial
- [ ] Basic library management guide
- [ ] FAQ (top 20 questions)
- [ ] Troubleshooting guide

### Phase 2: Expansion (Post-Launch, Month 1-3)

**Goal:** Comprehensive user-facing documentation
**Timeline:** 3 months after launch

**Priority Content:**

- [ ] All User Guide sections with screenshots
- [ ] 5 core video tutorials
- [ ] Use case pages (all 5 personas)
- [ ] Comparison content (Calibre, Goodreads)
- [ ] Migration guides
- [ ] Expanded FAQ (50+ questions)
- [ ] Glossary with tooltips

### Phase 3: Advanced (Month 4-6)

**Goal:** Power user and developer content
**Timeline:** 6 months after launch

**Priority Content:**

- [ ] CLI comprehensive guide
- [ ] API documentation expansion
- [ ] Integration guides (Plex, etc.)
- [ ] Advanced tutorials
- [ ] Performance optimization guide
- [ ] Backup/restore procedures
- [ ] Multi-instance setup

### Phase 4: Community (Month 6+)

**Goal:** User-generated and community content
**Timeline:** Ongoing

**Priority Content:**

- [ ] User success stories
- [ ] Community-contributed guides
- [ ] Plugin/extension showcase
- [ ] Monthly blog posts
- [ ] Release notes and changelog
- [ ] Community highlights

## Content Production Workflow

### 1. **Content Creation Process**

**For Written Content:**

1. Outline and structure
2. First draft (focus on completeness)
3. Technical accuracy review
4. User perspective review
5. Copy editing
6. Accessibility check
7. Publish

**For Visual Content:**

1. Storyboard/shot list
2. Create demo library (curated books)
3. Record screenshots/video
4. Edit and annotate
5. Accessibility (alt text, subtitles)
6. Review and publish

### 2. **Quality Standards**

**Writing Standards:**

- Grade 8-10 reading level for user content
- Active voice preferred
- Short sentences (<25 words)
- Paragraphs <150 words
- Headings every 2-3 paragraphs
- Example code formatted correctly

**Visual Standards:**

- High DPI (2x) screenshots
- Consistent UI state (same demo library)
- Annotations use brand colors
- Dark mode examples where relevant
- Maximum image width for loading speed

**Video Standards:**

- 1080p minimum resolution
- Clean audio (no background noise)
- Subtitles/captions required
- Branded intro/outro (5 seconds)
- Upload to YouTube (embed in docs)
- Provide transcript for accessibility

### 3. **Maintenance & Updates**

**Content Auditing:**

- Review all docs with each major release
- Flag outdated screenshots
- Update changed functionality
- Add new feature documentation
- Archive deprecated features

**Feedback Loop:**

- Monitor "Was this helpful?" votes
- Track search queries (what users look for)
- Review support tickets for gaps
- User testing with new documentation
- Community feedback in GitHub Discussions

## Tone & Voice Guidelines

### Brand Voice: **Knowledgeable Friend**

**Attributes:**

- **Warm but professional:** Friendly without being overly casual
- **Confident but humble:** Expert guidance, acknowledges limitations
- **Clear but not simplistic:** Respects user intelligence
- **Encouraging but realistic:** Honest about complexity

**Voice Examples:**

**✅ Good:**

> "Metadata enrichment automatically fills in missing book information by querying trusted sources like Open Library and WikiData. It takes about 30 seconds per book, and you can review the suggestions before accepting them."

**❌ Too Technical:**

> "The metadata aggregator queries multiple provider endpoints via the reconciliation engine, which assigns confidence scores to returned entities based on fuzzy matching algorithms."

**❌ Too Casual:**

> "Hey! So metadata enrichment is like super cool—it magically finds info about your books! 🎉"

**❌ Too Formal:**

> "The metadata enrichment subsystem facilitates the automated retrieval and integration of bibliographic data from external authoritative sources."

### Writing Patterns

**Use:**

- "You'll need..." (not "one must have")
- "Let's..." (not "we will")
- "Here's how..." (not "the process is")
- "If this happens..." (not "in the event of")

**Avoid:**

- Corporate jargon ("leverage," "utilize," "synergy")
- Unnecessary technical terms (explain when needed)
- Gendered pronouns (use "they/their" or "you/your")
- Absolutes ("always," "never") unless truly accurate

## Localization Strategy

### Phase 1: English Priority

**Focus:** Perfect English documentation first
**Timeline:** Pre-launch and first 6 months

### Phase 2: Top Languages

**Priority Order:**

1. **German** (strong open-source community, tech-savvy users)
2. **Spanish** (large reading community, global reach)
3. **French** (European market, privacy-conscious)
4. **Portuguese** (Brazil: large reading market)

**Implementation:**

- Use i18n-friendly structure from day one
- Avoid idioms and culturally-specific references
- Professional translation (not machine translation)
- Native speaker review required
- Community translation contributions welcome

### Content to Prioritize for Translation:

1. Homepage and Getting Started (highest priority)
2. User Guide
3. FAQ
4. Setup/Installation
5. Glossary
6. CLI/API docs (lower priority)

## Success Metrics

### Content Effectiveness Metrics

**User Engagement:**

- Time on page (target: >2 minutes for guides)
- Bounce rate (target: <40%)
- Page depth (target: >3 pages per session)
- Return visits (target: >30% return rate)

**Task Completion:**

- Setup success rate (target: >80% complete Quick Start)
- Time to first upload (target: <15 minutes)
- Support ticket reduction (target: -30% after content updates)

**Search & Discovery:**

- Search query patterns (identify content gaps)
- Search success rate (target: >70% find what they need)
- Top viewed pages (identify popular topics)

**User Satisfaction:**

- "Was this helpful?" votes (target: >75% positive)
- Documentation NPS score (target: >50)
- User testimonials and feedback

**Conversion (if applicable):**

- Installation completions
- GitHub stars/contributions
- Community growth (Discord, forums)

## Open Questions

### Content Creation

1. **Demo Library:** What books to use for screenshots? (Public domain? Generic titles?)
2. **Video Hosting:** YouTube (free, accessible) vs. self-hosted (privacy, control)?
3. **User Testing:** How to recruit beta testers for documentation feedback?
4. **Professional Help:** Budget for professional videographer/technical writer?

### Community Involvement

1. **Contributions:** How to handle community-contributed guides?
2. **Translations:** Incentivize community translations?
3. **Showcase:** Feature user libraries/setups (with permission)?
4. **Forums:** Where to host community discussions? (GitHub Discussions? Discord? Discourse?)

### Business Decisions

1. **Demo Instance:** Provide public demo? (Pros: try before install, Cons: maintenance, abuse)
2. **Paid Support:** Offer paid documentation or support? (Conflicts with open-source ethos)
3. **Certification:** Create "Colibri Certified Admin" program?

### Technical Considerations

1. **Offline Docs:** Make documentation available offline (PWA)?
2. **In-App Help:** Link to docs from within Colibri interface?
3. **Version Docs:** Maintain separate docs for each major version?
4. **API Playground:** Interactive API explorer for developers?

## Appendix: Content Templates

### Template: Tutorial Page

````markdown
---
title: [Task Name]
description: [One-sentence description]
level: [Beginner/Intermediate/Advanced]
time: [Estimated time to complete]
---

# [Task Name]

[Brief introduction - what will they accomplish?]

## Prerequisites

- [ ] Prerequisite 1
- [ ] Prerequisite 2

## What You'll Learn

By the end of this guide, you'll be able to:

- Outcome 1
- Outcome 2
- Outcome 3

## Steps

### Step 1: [Action]

[Clear instruction]

```bash
# Example command
```
````

**Expected result:** [What they should see]

[Screenshot if applicable]

### Step 2: [Action]

[Continue...]

## Verification

[How to confirm it worked]

## Next Steps

- [Related guide 1]
- [Related guide 2]

## Troubleshooting

**Problem:** [Common issue]
**Solution:** [How to fix]

---

**Was this helpful?** [Yes] [No] [Feedback]

````

### Template: Use Case Page
```markdown
---
title: Colibri for [Persona Type]
description: How [Persona Name] uses Colibri
---

# Colibri for [Persona Type]

## Meet [Persona Name]

[Photo/illustration]

**Profile:**
- [Demographic info]
- [Reading habits]
- [Tech comfort level]
- [Library size]

## The Challenge

[What problem did they face?]

## The Solution

[How Colibri solved it]

## Features They Love

### [Feature 1]
[How they use it and why]

### [Feature 2]
[How they use it and why]

### [Feature 3]
[How they use it and why]

## The Result

> "[Quote from persona about their experience]"

**Outcome:**
- [Measurable benefit]
- [Qualitative benefit]

## Could This Be You?

[Call to action to get started]

---

**Similar Use Cases:**
- [Related persona 1]
- [Related persona 2]
````

---

**Document Status:** Draft v1.0
**Last Updated:** 2026-01-09
**Owner:** Documentation Team
**Review Cycle:** Quarterly
