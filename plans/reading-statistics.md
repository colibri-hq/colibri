# Reading Statistics & Analytics

## Description

Personal reading statistics dashboard showing reading habits, progress toward goals, and historical data. Requires
reading progress tracking to be implemented first.

## Current Implementation Status

**Not Implemented:**

- ❌ No statistics collection
- ❌ No analytics dashboard
- ❌ No reading goals
- ❌ No visualizations

**Dependencies:**

- ⏳ Requires: reading-progress.md
- ⏳ Requires: ratings-system.md

## Implementation Plan

### Phase 1: Data Collection

1. Aggregate from reading progress:
    - Books started/finished
    - Pages/time read
    - Reading sessions

2. Create statistics views:
   ```sql
   CREATE VIEW user_reading_stats AS
   SELECT
     user_id,
     COUNT(*) FILTER (WHERE status = 'completed') as books_completed,
     COUNT(*) FILTER (WHERE status = 'reading') as books_reading,
     SUM(total_time_minutes) as total_reading_time,
     AVG(days_to_complete) as avg_completion_days
   FROM reading_progress
   GROUP BY user_id;
   ```

### Phase 2: Statistics API

1. tRPC procedures:
   ```typescript
   stats.overview({ userId, year? })
   stats.byMonth({ userId, year })
   stats.byGenre({ userId })
   stats.readingStreak({ userId })
   stats.goals({ userId, year })
   ```

### Phase 3: Statistics Dashboard

1. Overview cards:
    - Books read this year
    - Pages read
    - Reading time
    - Current streak

2. Charts:
    - Books per month
    - Reading by genre/tag
    - Rating distribution

### Phase 4: Reading Goals

1. Goal setting:
   ```typescript
   type ReadingGoal = {
     userId: string;
     year: number;
     type: 'books' | 'pages' | 'time';
     target: number;
     current: number;
   };
   ```

2. Progress tracking
3. Goal notifications

### Phase 5: Reading Streaks

1. Track consecutive reading days
2. Streak milestones
3. Streak recovery (grace period)

### Phase 6: Insights

1. "You read most on Sundays"
2. "Your average book takes 12 days"
3. "You prefer mystery novels"

## Statistics Views

| Metric              | Period   | Visualization      |
|---------------------|----------|--------------------|
| Books completed     | Year     | Number + bar chart |
| Pages read          | Month    | Line chart         |
| Time spent          | Week     | Stacked bar        |
| Genre distribution  | All time | Pie chart          |
| Rating distribution | All time | Histogram          |

## Open Questions

1. **Privacy**: Share stats publicly (Year in Books)?
2. **Gamification**: Badges and achievements?
3. **Comparisons**: Compare to community averages?
4. **Goals**: Multiple simultaneous goals?
5. **History**: How far back to track?
6. **Estimates**: Estimate time to finish current book?
