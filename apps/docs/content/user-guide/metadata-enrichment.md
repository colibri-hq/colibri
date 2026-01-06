---
title: Metadata Enrichment
description: Enrich your library with metadata from external sources
date: 2024-01-01
order: 3
tags: [metadata, enrichment, automation, providers]
relevance: 90
---

# Metadata Enrichment

Colibri can automatically enrich your ebook metadata using 14+ external providers, improving accuracy and completeness
with data from trusted sources like Open Library, WikiData, Library of Congress, and more.

## How It Works

The enrichment system fetches metadata from multiple sources and intelligently merges the results:

### 1. Search

Colibri searches metadata providers using the best available identifiers:

- **ISBN** (most reliable): Direct lookup in authoritative databases
- **Title + Author**: Multi-criteria search across providers
- **Title only**: Fuzzy matching with language filtering

**Search Strategy:**

- Providers are queried in parallel for speed
- Each provider returns results with confidence scores
- Searches timeout after 30 seconds to prevent hanging

### 2. Aggregate

Results from all providers are collected and deduplicated:

- **ISBN matching**: Merge records with matching ISBN-10 or ISBN-13
- **Title similarity**: Combine records with similar titles (85%+ similarity)
- **Author normalization**: Handle name variations ("J.K. Rowling" = "Rowling, J.K.")

**Result Ranking:**

- Records are scored by confidence and completeness
- Higher-priority providers carry more weight
- Duplicate editions are identified and grouped

### 3. Score

Each metadata field receives a confidence score based on:

| Factor                | Impact         | Description                                                  |
|-----------------------|----------------|--------------------------------------------------------------|
| **Source Count**      | +5% per source | Multiple providers agreeing increases confidence             |
| **Source Quality**    | +8%            | High-priority providers (WikiData, LoC) boost scores         |
| **Field Agreement**   | +10%           | Same values across sources significantly increase confidence |
| **Data Completeness** | +5%            | More complete records score higher                           |
| **Disagreement**      | -10% to -20%   | Conflicting data lowers confidence                           |

**Confidence Tiers:**

| Score   | Tier        | Meaning                              | Action                          |
|---------|-------------|--------------------------------------|---------------------------------|
| 95-100% | Exceptional | Multiple authoritative sources agree | Auto-apply with high confidence |
| 90-95%  | Strong      | Good consensus across sources        | Safe to apply automatically     |
| 80-90%  | Good        | Moderate agreement, likely accurate  | Review before applying          |
| 70-80%  | Moderate    | Some disagreement between sources    | Manual review recommended       |
| 50-70%  | Weak        | Limited agreement                    | Verify manually                 |
| &lt;50% | Poor        | Significant conflicts                | Do not apply automatically      |

### 4. Preview

You review the proposed changes before applying them:

- **Side-by-side comparison**: See original vs. enriched metadata
- **Source attribution**: Know which provider contributed each field
- **Conflict resolution**: Choose between conflicting values
- **Selective application**: Apply only the fields you trust

## Available Providers

Colibri integrates with 14+ metadata providers, each with unique strengths.

### Free Providers (No API Key Required)

| Provider                | Best For                                 | Coverage                  | Reliability     |
|-------------------------|------------------------------------------|---------------------------|-----------------|
| **Open Library**        | General books, covers, editions          | International, broad      | High (95%)      |
| **WikiData**            | Authoritative data, structured metadata  | Curated, high-quality     | Very High (98%) |
| **Library of Congress** | US publications, cataloging, subjects    | US-centric, comprehensive | Very High (95%) |
| **Internet Archive**    | Public domain, historical works          | Archive.org collection    | High (85%)      |
| **VIAF**                | Author identification, authority records | International authors     | High (90%)      |
| **ISNI**                | Creator identity, disambiguation         | Authors & publishers      | High (95%)      |
| **Crossref**            | Academic publications, DOIs              | Scholarly works           | Very High (92%) |
| **DOAB**                | Open access academic books               | Academic publishers       | High (88%)      |
| **DNB**                 | German publications                      | Germany-focused           | High (90%)      |
| **BNB**                 | British publications                     | UK-focused                | High (88%)      |

**Setup:**

- No configuration required
- Enabled by default
- Rate-limited to prevent abuse

### Authenticated Providers (API Key Required)

| Provider         | Best For                                  | API Key Source                                             | Cost                              |
|------------------|-------------------------------------------|------------------------------------------------------------|-----------------------------------|
| **Google Books** | Covers, descriptions, ratings, popularity | [Google Cloud Console](https://console.cloud.google.com/)  | Free (with limits)                |
| **ISBNdb**       | Comprehensive book data, new releases     | [ISBNdb.com](https://isbndb.com/apidocs)                   | Paid (subscription)               |
| **Springer**     | Academic books, chapters, journals        | [Springer API Portal](https://dev.springernature.com/)     | Free (academic)                   |
| **Amazon PAAPI** | Amazon-exclusive titles, customer reviews | [Amazon Associates](https://affiliate-program.amazon.com/) | Free (requires affiliate account) |

**Setup:**

1. Obtain API key from provider
2. Navigate to **Settings > Instance > Metadata Providers**
3. Enter API key for desired provider
4. Enable the provider
5. Save settings

**Rate Limits:**

- Google Books: 1,000 requests/day (free tier)
- ISBNdb: Varies by subscription tier
- Springer: 5,000 requests/week (free academic)
- Amazon PAAPI: 8,640 requests/day (1 per 10 seconds)

### Provider Comparison by Data Type

| Data Type             | Best Providers                                  | Notes                                       |
|-----------------------|-------------------------------------------------|---------------------------------------------|
| **ISBN Lookup**       | WikiData, Library of Congress, Open Library     | Parallel queries for best coverage          |
| **Cover Images**      | Open Library, Google Books, Internet Archive    | Open Library has largest collection         |
| **Descriptions**      | Google Books, Open Library, Library of Congress | Google Books often has most detailed        |
| **Author Info**       | VIAF, ISNI, WikiData                            | VIAF best for authority records             |
| **Subjects/Tags**     | Library of Congress, Open Library, WikiData     | LoC has most comprehensive subject headings |
| **Series**            | Open Library, Google Books                      | Often missing from other sources            |
| **Publication Dates** | WikiData, Library of Congress                   | Most authoritative for dates                |
| **Publishers**        | WikiData, Library of Congress, Open Library     | WikiData best for normalized names          |

## Enriching a Book

### Automatic Enrichment (During Upload)

Enable automatic enrichment in **Settings > Instance > Metadata**:

1. Toggle **Auto-enrich on upload**
2. Select enrichment strategy (Conservative, Aggressive, or Merge)
3. Choose which providers to use (or use all)
4. Set minimum confidence threshold for auto-apply

**How it works:**

- When you upload a book, enrichment runs automatically
- Results are merged with embedded metadata
- High-confidence fields are applied immediately
- Low-confidence fields are flagged for review
- You can still review and edit before saving

**Recommended for:**

- Bulk imports where manual review isn't practical
- Books with good embedded metadata that just need minor improvements
- Users who trust the enrichment system

### Manual Enrichment (On-Demand)

Enrich books already in your library:

1. **Navigate to the work's detail page**
    - Click on any book in your library
    - Or search for the book and open its detail page

2. **Click "Fetch Metadata"**
    - Button is in the top-right corner
    - May also appear as "Enrich" or "Update Metadata"

3. **Wait for providers to respond**
    - Progress indicator shows which providers are querying
    - Typically completes in 5-10 seconds
    - Some providers may timeout (this is normal)

4. **Review the suggestions**
    - Opens the enrichment preview modal
    - Shows original values vs. enriched values
    - Each field displays:
        - Current value (from your library)
        - Suggested value (from enrichment)
        - Confidence score (0-100%)
        - Source provider(s)
        - Conflict indicator (if values disagree)

5. **Accept or reject changes**
    - **Accept All**: Apply all high-confidence suggestions (90%+)
    - **Reject All**: Keep all existing metadata
    - **Selective**: Choose individual fields to apply
    - **Edit Manually**: Override with your own values

6. **Save changes**
    - Click "Apply" to update the book's metadata
    - Original metadata is preserved in version history

**Recommended for:**

- Books with missing or incomplete metadata
- Correcting errors in existing metadata
- Adding detailed descriptions and subjects
- Finding better cover images

### Batch Enrichment (Advanced)

Enrich multiple books at once using the CLI:

```bash
# Enrich all books in your library
colibri works enrich --all

# Enrich books with missing descriptions
colibri works enrich --filter "synopsis:null"

# Enrich books by specific author
colibri works enrich --creator "J.K. Rowling"

# Use specific providers
colibri works enrich --providers "WikiData,OpenLibrary"
```

See [CLI Documentation](/user-guide/cli/works) for more batch operations.

## Confidence Scores Explained

Confidence scores help you understand how reliable the enriched metadata is.

### Score Calculation

Base confidence from provider reliability:

| Provider            | Base Confidence | Why                                   |
|---------------------|-----------------|---------------------------------------|
| WikiData            | 90%             | Curated, structured data              |
| Library of Congress | 88%             | Authoritative cataloging              |
| Open Library        | 85%             | Large coverage, community-contributed |
| Google Books        | 85%             | Commercial data, generally reliable   |
| VIAF                | 90%             | Authority records                     |
| Others              | 70-85%          | Varies by provider                    |

**Modifiers:**

```
Final Confidence = Base Confidence
                 + (Source Count Boost × 5%)
                 + (Agreement Boost × 10%)
                 + (Quality Boost × 8%)
                 - (Disagreement Penalty × 10-20%)
```

**Example:**

```
WikiData alone: 90%
+ LoC agreeing: 95% (+5% source boost)
+ OpenLib agreeing: 98% (+3% source boost, +5% agreement boost, capped at 98%)
```

### Interpreting Scores

**95-100% (Exceptional)**

- Multiple authoritative sources agree
- Very safe to auto-apply
- Example: ISBN found in WikiData, LoC, and Open Library with identical metadata

**90-95% (Strong)**

- High consensus across sources
- Safe to apply automatically
- Example: Title and author from 2+ reliable sources

**80-90% (Good)**

- Moderate agreement, likely accurate
- Review recommended for important fields
- Example: Publication date from WikiData and LoC, but with slight year difference

**70-80% (Moderate)**

- Some disagreement between sources
- Manual review strongly recommended
- Example: Subject tags from different providers with partial overlap

**50-70% (Weak)**

- Limited agreement or single source
- Verify manually before applying
- Example: Description from only one provider

**&lt;50% (Poor)**

- Significant conflicts or unreliable data
- Do not apply automatically
- Example: Title variations across all providers

### Confidence by Field Type

Different metadata fields have different natural confidence levels:

| Field            | Typical Confidence | Why                                               |
|------------------|--------------------|---------------------------------------------------|
| ISBN             | 95-98%             | Standardized, exact matching                      |
| Title            | 85-95%             | Minor variations common (subtitles, edition info) |
| Authors          | 90-95%             | Generally reliable, name formatting varies        |
| Publication Date | 85-92%             | Can vary by edition or print date                 |
| Publisher        | 80-90%             | Name variations and acquisitions affect matching  |
| Description      | 70-85%             | Can vary significantly between sources            |
| Subjects         | 75-90%             | Different classification systems used             |
| Series           | 70-85%             | Often missing or inconsistent                     |
| Page Count       | 80-90%             | Edition-specific, generally reliable              |
| Language         | 95-98%             | Standardized codes, rarely conflicts              |

## Conflict Resolution

When providers disagree on metadata values, Colibri helps you resolve conflicts intelligently.

### Types of Conflicts

**1. Direct Conflicts**

- Multiple providers return different values for the same field
- Example: WikiData says published in 2020, LoC says 2019

**2. Missing Data**

- Some providers have a value, others don't
- Not technically a conflict, but requires decision-making

**3. Format Variations**

- Same semantic value, different formatting
- Example: "1,234 pages" vs "1234" for page count

### Automatic Resolution Strategies

**For Titles:**

- Prefer shortest version if titles are similar (avoid edition suffixes)
- Example: "The Great Gatsby" preferred over "The Great Gatsby (Penguin Classics)"

**For Authors:**

- Merge and deduplicate names
- Normalize formatting: "Rowling, J.K." = "J.K. Rowling"
- Include all unique authors across sources

**For ISBNs:**

- Collect all unique ISBNs (different editions are valid)
- Normalize: remove hyphens, validate checksums
- Keep both ISBN-10 and ISBN-13

**For Publication Dates:**

- Use earliest date if dates are close (within 1 year)
- Prefer full date (YYYY-MM-DD) over year-only
- First edition date is canonical

**For Descriptions:**

- Prefer longest/most complete description
- Merge if complementary (use advanced reconciliation)

**For Subjects:**

- Merge all subjects, deduplicate by normalization
- Lowercase, trim, remove punctuation for comparison
- More subjects = better discoverability

**For Publishers:**

- Use most reliable source in priority order
- Prefer full name over abbreviation

**For Series:**

- Choose most complete series data (name + volume)
- Prefer numerical volume over text

### Manual Resolution

When automatic resolution isn't confident enough, you choose:

**Conflict Preview:**

```
Title Conflict Detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current: "The Great Gatsby"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Suggestions:
○ "The Great Gatsby" (90% confidence)
  Sources: WikiData, Open Library

○ "The Great Gatsby (Penguin Classics)" (75% confidence)
  Sources: Google Books

○ "Great Gatsby, The" (65% confidence)
  Sources: Library of Congress

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ Keep Current ] [ Select Suggestion ] [ Edit Manually ]
```

**Resolution Options:**

1. **Keep Current**: Ignore enrichment for this field
2. **Accept Highest Confidence**: Use the suggested value with the best score
3. **Choose Specific Source**: Select a value from a particular provider
4. **Edit Manually**: Enter your own value

## Configuring Providers

Customize which providers are used and how they're prioritized.

### Provider Settings

Navigate to **Settings > Instance > Metadata Providers**:

**Global Settings:**

- **Auto-enrich on upload**: Enable/disable automatic enrichment
- **Enrichment strategy**: Conservative, Aggressive, or Merge
- **Minimum confidence**: Threshold for auto-applying fields (default: 80%)
- **Timeout**: Maximum time to wait for providers (default: 30s)
- **Max parallel providers**: How many providers to query simultaneously (default: 3)

**Per-Provider Settings:**

For each provider, you can configure:

| Setting         | Description                     | Example   |
|-----------------|---------------------------------|-----------|
| **Enabled**     | Whether to use this provider    | ✓         |
| **Priority**    | Query order (higher = first)    | 85        |
| **API Key**     | Authentication credential       | `AIza...` |
| **Rate Limit**  | Requests per minute             | 60        |
| **Timeout**     | Max wait time for this provider | 20s       |
| **Reliability** | Base confidence score           | 90%       |

**Priority Order (Default):**

1. WikiData (85)
2. Library of Congress (85)
3. Open Library (80)
4. ISNI (70)
5. VIAF (70)
6. Google Books (75, if API key configured)
7. Others (varies)

### Provider Strategies

**Default (Parallel Queries):**

- Queries top 3 providers simultaneously
- Fastest results
- Best for ISBN searches
- Recommended for most users

**Sequential (Fallback):**

- Queries one provider at a time
- Stops when high-confidence match found
- Slower but reduces API usage
- Best for title-only searches

**Consensus (Maximum Coverage):**

- Queries all enabled providers
- Best for cross-validation
- Highest confidence scores
- Slowest, uses most API calls

Configure strategy in **Settings > Instance > Metadata > Query Strategy**.

### Custom Provider Configuration

Advanced users can fine-tune provider behavior:

**Example: Prioritize WikiData for ISBN searches**

```json
{
  "providerStrategy": {
    "isbn": [
      "WikiData",
      "LibraryOfCongress",
      "OpenLibrary"
    ],
    "title": [
      "OpenLibrary",
      "WikiData",
      "GoogleBooks"
    ],
    "author": [
      "VIAF",
      "ISNI",
      "WikiData"
    ]
  }
}
```

**Example: Disable specific providers**

```json
{
  "disabledProviders": [
    "Springer",
    "DNB"
  ]
}
```

See [Configuration Guide](/setup/configuration) for advanced settings.

## Best Practices

### When to Enrich

**Always Enrich:**

- Books with missing metadata (no description, subjects, etc.)
- Scanned/OCR books with poor embedded metadata
- Foreign language books needing proper language detection

**Sometimes Enrich:**

- Books with partial metadata that could be improved
- Books where you want to verify existing metadata
- Adding series information to standalone imports

**Rarely Enrich:**

- Books with complete, accurate embedded metadata
- Rare or niche books unlikely to be in external databases
- Books where you've manually curated metadata

### Choosing Providers

**For General Fiction:**

- Open Library (broad coverage)
- WikiData (structured data)
- Google Books (descriptions)

**For Academic Works:**

- Crossref (DOI resolution)
- Springer (academic publishers)
- Library of Congress (cataloging)

**For Foreign Language Books:**

- DNB (German)
- BNB (British)
- WikiData (international)

**For Historical Works:**

- Library of Congress (authority)
- Internet Archive (public domain)
- VIAF (author authority)

### Enrichment Workflow

1. **Upload books** with embedded metadata
2. **Review automatic enrichment** results
3. **Manually enrich** books with missing data
4. **Verify high-value fields**: Title, Author, ISBN
5. **Accept lower-priority fields**: Subjects, descriptions (easier to fix later)
6. **Edit series information** if detected incorrectly
7. **Add custom metadata**: Personal tags, ratings, reviews

## Troubleshooting

### No Results Found

**Problem**: Enrichment returns no suggestions

**Causes:**

- Book not in external databases (rare, self-published, or very new)
- ISBN is incorrect or missing
- Title/author query is too specific or has typos
- Providers are down or rate-limited

**Solutions:**

- Verify ISBN is correct
- Try searching with just the title
- Use fewer providers to avoid rate limits
- Wait a few minutes and try again
- Check provider status at **Settings > Instance > Metadata Providers**

### Low Confidence Scores

**Problem**: All suggestions have &lt;70% confidence

**Causes:**

- Multiple editions exist with different metadata
- Book has been republished with changes
- Providers have conflicting information
- Title or author has variations

**Solutions:**

- Review each suggestion carefully
- Choose the most authoritative source (WikiData or LoC)
- Manually edit to combine best aspects of each
- Accept lower confidence if the suggestion is clearly correct

### Timeout Errors

**Problem**: "Enrichment timeout" error appears

**Causes:**

- Providers are slow to respond
- Network connectivity issues
- Too many providers enabled
- Provider API is temporarily down

**Solutions:**

- Reduce number of providers queried
- Increase timeout in settings (Settings > Instance > Metadata > Timeout)
- Retry with only fast providers (Open Library)
- Check provider status and disable slow ones

### Incorrect Data

**Problem**: Enrichment suggests wrong book or metadata

**Causes:**

- ISBN collision (rare but possible)
- Title/author fuzzy matching is too broad
- Provider database has errors
- Different edition than expected

**Solutions:**

- Reject the suggestion and try a different provider
- Manually verify ISBN is correct
- Use title + author search instead of ISBN
- Report data errors to the provider (most have feedback mechanisms)

### API Key Errors

**Problem**: "Authentication failed" or "API key invalid"

**Causes:**

- API key not configured
- API key is incorrect or expired
- Provider account has reached rate limits or quota
- Provider service is down

**Solutions:**

- Verify API key is entered correctly in Settings
- Check provider account status (quota, billing, etc.)
- Wait for rate limit to reset
- Disable authenticated provider and use free alternatives

## Advanced Features

### Provider Health Monitoring

View provider status in real-time:

**Navigate to Settings > Instance > Metadata Providers > Health**

Displays for each provider:

- **Status**: Online, Offline, or Degraded
- **Response Time**: Average latency
- **Success Rate**: Percentage of successful queries
- **Last Error**: Most recent failure message
- **Rate Limit**: Current usage vs. limit

### Enrichment History

Track what metadata has been enriched:

**Work Detail Page > Metadata Tab > History**

Shows:

- Which fields were enriched
- When enrichment occurred
- Which provider contributed each value
- Original values before enrichment
- User who applied the enrichment

**Rollback:**

- Click "Revert" on any enrichment to undo it
- Restores previous metadata values
- Preserves enrichment history for auditing

### Custom Metadata Sources

Advanced users can add custom metadata providers:

1. Implement the `MetadataProvider` interface
2. Register provider with Colibri
3. Configure API endpoint and authentication
4. Enable in provider settings

See the SDK metadata documentation for implementation details.

## Related Documentation

- [Uploading Books](/user-guide/uploading-books)
- [Configuration Guide](/setup/configuration)
- [SDK Metadata Documentation](/packages/sdk/metadata)
