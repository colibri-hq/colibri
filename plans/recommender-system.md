# Recommender System

## Description

Provide personalized book recommendations based on reading history, ratings, and similarity to books the user has
enjoyed. Help users discover new books in their library and suggest additions from external catalogs.

## Current Implementation Status

**Not Implemented:**

- ❌ No recommendation engine
- ❌ No reading history tracking
- ❌ No similarity calculations

**Existing Infrastructure:**

- ✅ Ratings table exists
- ✅ Tags/subjects on editions
- ✅ Series relationships
- ✅ Creator (author) relationships

## Implementation Plan

### Phase 1: Reading History Tracking

1. Create reading activity table:
   ```sql
   CREATE TABLE reading_progress (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES authentication.user(id),
     edition_id UUID NOT NULL REFERENCES edition(id),
     started_at TIMESTAMPTZ,
     finished_at TIMESTAMPTZ,
     progress_percent SMALLINT DEFAULT 0,
     last_position TEXT, -- EPUB CFI or page number
     time_spent_minutes INTEGER DEFAULT 0,
     UNIQUE(user_id, edition_id)
   );
   ```

### Phase 2: Similarity Calculation

1. Content-based filtering factors:
    - Same author(s)
    - Same series
    - Overlapping tags/subjects
    - Same publisher
    - Publication year proximity
    - Similar page count/length

2. Calculate similarity scores:
   ```typescript
   function calculateSimilarity(bookA: Work, bookB: Work): number {
     let score = 0;
     if (shareAuthor(bookA, bookB)) score += 0.4;
     if (sameSeries(bookA, bookB)) score += 0.3;
     if (shareSubjects(bookA, bookB)) score += 0.2;
     if (samePublisher(bookA, bookB)) score += 0.1;
     return score;
   }
   ```

### Phase 3: Collaborative Filtering (Optional)

1. User-user similarity based on ratings
2. Item-item similarity based on co-ratings
3. Matrix factorization for larger datasets

### Phase 4: Recommendation Types

1. "Because you read X" - similar to specific book
2. "More by this author" - same creator
3. "Continue the series" - next in series
4. "Popular in your library" - family/instance trends
5. "Based on your ratings" - overall taste profile

### Phase 5: Recommendation API

1. tRPC procedures:
   ```typescript
   recommendations.forBook(workId, limit)
   recommendations.forUser(userId, limit)
   recommendations.bySeries(seriesId)
   recommendations.byAuthor(creatorId)
   recommendations.trending()
   ```

### Phase 6: UI Integration

1. "You might also like" section on book detail
2. Personalized home page recommendations
3. "Recommended for you" collection
4. Recommendation explanation (why suggested)

### Phase 7: External Recommendations

1. Suggest books not in library
2. Integration with external catalogs
3. "Add to library" from recommendation

## Recommendation Algorithms

| Algorithm     | Data Needed   | Cold Start   | Scalability |
|---------------|---------------|--------------|-------------|
| Content-based | Book metadata | Handles well | Good        |
| Collaborative | User ratings  | Struggles    | Moderate    |
| Hybrid        | Both          | Better       | Moderate    |
| Series/Author | Relationships | N/A          | Excellent   |

## Scoring Factors

| Factor             | Weight | Description              |
|--------------------|--------|--------------------------|
| Author match       | 0.40   | Same author(s)           |
| Series match       | 0.30   | Same series              |
| Subject overlap    | 0.20   | Shared tags/subjects     |
| Rating correlation | 0.15   | Users who liked both     |
| Publisher match    | 0.05   | Same publisher           |
| Year proximity     | 0.05   | Similar publication date |

## Open Questions

1. **Cold Start**: How to recommend for new users with no history?
2. **Privacy**: Store reading history indefinitely, or with TTL?
3. **Algorithm Choice**: Content-based only, or add collaborative?
4. **Family Sharing**: Recommend based on family reading, or individual?
5. **Age Appropriateness**: Filter recommendations by user age?
6. **Explanation**: Show why a book was recommended?
7. **Feedback Loop**: Allow "not interested" to improve recommendations?
8. **External Data**: Use external ratings (Goodreads, etc.) for better recs?
