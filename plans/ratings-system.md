> **GitHub Issue:** [#152](https://github.com/colibri-hq/colibri/issues/152)

# Ratings System

## Description

Star rating system for books, separate from written reviews. Users can rate books on a 5-star scale, and ratings are
aggregated for display. The system exists partially but needs complete implementation.

## Current Implementation Status

**Partially Implemented:**

- ✅ `work_rating` table exists (user_id, work_id, rating)
- ✅ SDK functions exist (`updateRating`, `loadRatings`)
- ✅ tRPC procedures exist
- ✅ RatingWidget component exists
- ✅ StarRating component exists

**Not Complete:**

- ❌ No aggregated rating display (average, count)
- ❌ No rating distribution visualization
- ❌ No rating in book cards
- ❌ No "Rate this book" prompt
- ❌ No rating filtering in search

## Implementation Plan

### Phase 1: Aggregated Ratings

1. Add computed columns or view:

   ```sql
   -- Option A: Materialized view
   CREATE MATERIALIZED VIEW work_rating_aggregate AS
   SELECT
     work_id,
     COUNT(*) as rating_count,
     AVG(rating) as average_rating,
     COUNT(*) FILTER (WHERE rating = 5) as five_star,
     COUNT(*) FILTER (WHERE rating = 4) as four_star,
     COUNT(*) FILTER (WHERE rating = 3) as three_star,
     COUNT(*) FILTER (WHERE rating = 2) as two_star,
     COUNT(*) FILTER (WHERE rating = 1) as one_star
   FROM work_rating
   GROUP BY work_id;

   -- Option B: Trigger-maintained columns on work
   ALTER TABLE work ADD COLUMN
     average_rating DECIMAL(2,1),
     rating_count INTEGER DEFAULT 0;
   ```

### Phase 2: SDK Enhancement

1. Enhance rating resources:
   ```typescript
   export async function getRatingForWork(db, workId);
   export async function getUserRating(db, userId, workId);
   export async function setRating(db, userId, workId, rating);
   export async function removeRating(db, userId, workId);
   export async function getRatingDistribution(db, workId);
   ```

### Phase 3: Rating Display Components

1. AverageRating component:

   ```svelte
   <AverageRating value={4.2} count={156} />
   <!-- Displays: ★★★★☆ 4.2 (156 ratings) -->
   ```

2. RatingDistribution component:
   ```svelte
   <RatingDistribution {distribution} />
   <!-- Horizontal bar chart showing 5→1 star distribution -->
   ```

### Phase 4: Interactive Rating

1. Enhance StarRating for input:
   - Hover preview
   - Click to set
   - Click again to remove
   - Half-star support (optional)

2. "Rate this book" prompt after finishing

### Phase 5: UI Integration

1. Show average rating on book cards
2. Show rating on book detail page
3. Show user's rating (if exists)
4. Rating prompt after marking complete

### Phase 6: Filtering & Sorting

1. Filter by minimum rating
2. Sort by average rating
3. "Highly rated" section
4. "Not yet rated" filter

### Phase 7: Rating Insights

1. User's rating history
2. Rating statistics (avg given, distribution)
3. Compare to average

## Rating Scale

```
★★★★★ (5) - Exceptional
★★★★☆ (4) - Great
★★★☆☆ (3) - Good
★★☆☆☆ (2) - Fair
★☆☆☆☆ (1) - Poor
```

## Display Formats

| Context | Format                       |
| ------- | ---------------------------- |
| Card    | ★ 4.2                        |
| Detail  | ★★★★☆ 4.2 (156 ratings)      |
| Full    | Distribution chart + average |

## Open Questions

1. **Scale**: 5-star, 10-point, or thumbs up/down?
2. **Half Stars**: Allow 0.5 increments?
3. **Required**: Must rate to review, or independent?
4. **Visibility**: Show who rated (privacy)?
5. **Weight**: Weight ratings by user activity/trust?
6. **Import**: Import ratings from Goodreads?
7. **Aggregation**: Real-time or periodic refresh?
8. **Editions**: Rate work or specific edition?
