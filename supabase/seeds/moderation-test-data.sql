-- Moderation Test Data Seed
-- This script creates test data to showcase different moderation states
-- Run with: PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seeds/moderation-test-data.sql

-- First, clean up any existing test data (IDs 1 and 100+)
DELETE FROM moderation_log WHERE id >= 100;
DELETE FROM comment_report WHERE id >= 100;
DELETE FROM comment_reaction WHERE comment_id >= 100;
DELETE FROM work_comment WHERE comment_id >= 100;
DELETE FROM comment WHERE id >= 100;
DELETE FROM edition WHERE id >= 100;
DELETE FROM work WHERE id >= 100;
DELETE FROM authentication.user WHERE (id = 1 OR (id >= 100 AND id < 999));

-- ============================================
-- TEST USERS
-- ============================================
INSERT INTO authentication.user (id, name, email, role, created_at) VALUES
  -- Admin/moderator
  (1, 'Admin Moderator', 'admin@colibri.test', 'admin', NOW() - INTERVAL '60 days'),
  -- Regular users who comment
  (100, 'Alice Reader', 'alice@example.com', 'adult', NOW() - INTERVAL '30 days'),
  (101, 'Bob Bookworm', 'bob@example.com', 'adult', NOW() - INTERVAL '25 days'),
  (102, 'Charlie Critic', 'charlie@example.com', 'adult', NOW() - INTERVAL '20 days'),
  (103, 'Diana Discusser', 'diana@example.com', 'adult', NOW() - INTERVAL '15 days'),
  (104, 'Eve Enthusiast', 'eve@example.com', 'adult', NOW() - INTERVAL '10 days'),
  -- Problematic users
  (105, 'Frank Spammer', 'frank@spam.com', 'adult', NOW() - INTERVAL '5 days'),
  (106, 'Grace Griefer', 'grace@troll.com', 'adult', NOW() - INTERVAL '3 days'),
  -- Reporters
  (107, 'Henry Helper', 'henry@example.com', 'adult', NOW() - INTERVAL '28 days'),
  (108, 'Ivy Inspector', 'ivy@example.com', 'adult', NOW() - INTERVAL '22 days')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;

-- ============================================
-- TEST WORKS & EDITIONS
-- ============================================
INSERT INTO work (id, created_by, created_at) VALUES
  (100, 100, NOW() - INTERVAL '20 days'),
  (101, 101, NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO edition (id, work_id, title, synopsis, created_at) VALUES
  (100, 100, 'The Great Adventure', 'An epic tale of discovery and friendship across fantastical lands.', NOW() - INTERVAL '20 days'),
  (101, 101, 'Mystery at Midnight', 'A gripping mystery novel that keeps you guessing until the very end.', NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

UPDATE work SET main_edition_id = 100 WHERE id = 100;
UPDATE work SET main_edition_id = 101 WHERE id = 101;

-- ============================================
-- COMMENTS (Various states and content types)
-- ============================================

-- Good comments (no issues)
INSERT INTO comment (id, content, created_by, created_at) VALUES
  (100, 'This book was absolutely wonderful! The characters felt so real and the plot kept me engaged throughout. Highly recommend to anyone who loves adventure stories.', 100, NOW() - INTERVAL '19 days'),
  (101, 'I really enjoyed the writing style. The author has a beautiful way with words that makes you feel like you are right there in the story.', 101, NOW() - INTERVAL '18 days'),
  (102, 'Just finished reading this and I am already planning to read it again. So many subtle details I want to catch on a second read.', 102, NOW() - INTERVAL '17 days'),
  (103, 'The ending was unexpected but satisfying. I appreciate when authors take risks with their storytelling.', 103, NOW() - INTERVAL '16 days'),
  (104, 'Perfect book for a rainy afternoon. Cozy, engaging, and thought-provoking.', 104, NOW() - INTERVAL '15 days');

-- Reply to a comment
INSERT INTO comment (id, content, created_by, created_at, parent_comment_id) VALUES
  (105, 'I completely agree! The character development was outstanding.', 101, NOW() - INTERVAL '18 days' + INTERVAL '2 hours', 100);

-- Controversial but not rule-breaking comments
INSERT INTO comment (id, content, created_by, created_at) VALUES
  (106, 'Honestly, I did not enjoy this book. The pacing felt off and I found the protagonist annoying. Different strokes for different folks, I guess.', 102, NOW() - INTERVAL '14 days'),
  (107, 'I thought it was mediocre at best. There are much better books in this genre.', 103, NOW() - INTERVAL '13 days');

-- Comments that have been reported and resolved (dismissed - no action taken)
INSERT INTO comment (id, content, created_by, created_at) VALUES
  (108, 'The author clearly has never experienced real adventure. This feels like it was written by someone who has never left their house. Still, it has its moments.', 102, NOW() - INTERVAL '12 days'),
  (109, 'I think this book is overrated. I really do not understand the hype around it.', 103, NOW() - INTERVAL '11 days');

-- Comments that have been hidden
INSERT INTO comment (id, content, created_by, created_at, hidden_at, hidden_by, hidden_reason) VALUES
  (110, 'This book is garbage and anyone who likes it is an idiot with no taste in literature whatsoever.', 106, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', 1, 'Insulting other users and using inappropriate language'),
  (111, 'The author should be ashamed of themselves for publishing this trash. Worst book I have ever read.', 106, NOW() - INTERVAL '9 days', NOW() - INTERVAL '8 days', 1, 'Excessive negativity and personal attack on author');

-- Spam comments (some hidden, some pending)
INSERT INTO comment (id, content, created_by, created_at, hidden_at, hidden_by, hidden_reason) VALUES
  (112, 'BUY CHEAP BOOKS AT WWW.SPAMSITE.COM - 90% OFF ALL TITLES!!!', 105, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', 1, 'Spam - promotional content');

INSERT INTO comment (id, content, created_by, created_at) VALUES
  (113, 'Check out my website for FREE EBOOKS: totallynotspam.net - You will love it!', 105, NOW() - INTERVAL '3 days'),
  (114, 'I make $5000 a day reading books! Learn my secret at earningscam.com', 105, NOW() - INTERVAL '2 days'),
  (115, 'DISCOUNT CODES FOR EBOOK READERS - Visit cheapstuff.biz NOW', 105, NOW() - INTERVAL '1 day');

-- Comments with minor issues (pending reports)
INSERT INTO comment (id, content, created_by, created_at) VALUES
  (116, 'Anyone who gave this less than 5 stars clearly cannot read properly.', 104, NOW() - INTERVAL '5 days'),
  (117, 'People who criticize this book are just jealous they cannot write this well themselves.', 100, NOW() - INTERVAL '4 days');

-- Comments on second book
INSERT INTO comment (id, content, created_by, created_at) VALUES
  (118, 'Great mystery novel! I was on the edge of my seat the whole time.', 100, NOW() - INTERVAL '10 days'),
  (119, 'The plot twist at the end was brilliant. Did not see it coming at all!', 101, NOW() - INTERVAL '9 days'),
  (120, 'A bit predictable, but still enjoyable. Good for a weekend read.', 102, NOW() - INTERVAL '8 days');

-- Offensive comment (pending, should be deleted)
INSERT INTO comment (id, content, created_by, created_at) VALUES
  (121, 'This book promotes harmful stereotypes and I find it deeply offensive. The author should face consequences for writing such problematic content.', 106, NOW() - INTERVAL '1 day');

-- ============================================
-- LINK COMMENTS TO WORKS
-- ============================================
INSERT INTO work_comment (work_id, comment_id) VALUES
  (100, 100), (100, 101), (100, 102), (100, 103), (100, 104), (100, 105),
  (100, 106), (100, 107), (100, 108), (100, 109), (100, 110), (100, 111),
  (100, 112), (100, 113), (100, 114), (100, 115), (100, 116), (100, 117),
  (101, 118), (101, 119), (101, 120), (101, 121)
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENT REACTIONS
-- ============================================
INSERT INTO comment_reaction (comment_id, user_id, emoji, created_at) VALUES
  -- Popular helpful comment
  (100, 101, '👍', NOW() - INTERVAL '18 days'),
  (100, 102, '👍', NOW() - INTERVAL '17 days'),
  (100, 103, '❤️', NOW() - INTERVAL '17 days'),
  (100, 104, '👍', NOW() - INTERVAL '16 days'),
  (100, 107, '🎉', NOW() - INTERVAL '16 days'),
  -- Agreement on good review
  (101, 100, '👍', NOW() - INTERVAL '17 days'),
  (101, 103, '❤️', NOW() - INTERVAL '17 days'),
  -- Mixed reactions on critical review
  (106, 107, '👍', NOW() - INTERVAL '13 days'),
  (106, 100, '😢', NOW() - INTERVAL '13 days'),
  -- Mystery book comment reactions
  (118, 101, '👍', NOW() - INTERVAL '9 days'),
  (119, 100, '🎉', NOW() - INTERVAL '8 days'),
  (119, 102, '👍', NOW() - INTERVAL '8 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENT REPORTS (Various states)
-- ============================================

-- PENDING REPORTS (need review)
INSERT INTO comment_report (id, comment_id, reported_by, reason, created_at) VALUES
  -- Spam reports (clear violations)
  (100, 113, 107, 'This is obvious spam promoting an external website. Please remove.', NOW() - INTERVAL '2 days'),
  (101, 114, 107, 'Spam comment - fake money-making scheme advertisement', NOW() - INTERVAL '1 day' + INTERVAL '2 hours'),
  (102, 115, 108, 'Promotional spam content, not a genuine book review', NOW() - INTERVAL '12 hours'),
  -- Reports on borderline content
  (103, 116, 108, 'This comment is insulting to other users who gave lower ratings', NOW() - INTERVAL '4 days'),
  (104, 117, 108, 'Dismissive and rude towards people with different opinions', NOW() - INTERVAL '3 days'),
  -- Report on problematic content
  (105, 121, 107, 'This comment makes serious accusations without evidence and could be defamatory', NOW() - INTERVAL '10 hours'),
  (106, 121, 108, 'Inflammatory content that could incite harassment of the author', NOW() - INTERVAL '8 hours');

-- RESOLVED REPORTS - Dismissed (report was unfounded)
INSERT INTO comment_report (id, comment_id, reported_by, reason, created_at, resolved_at, resolved_by, resolution) VALUES
  (107, 106, 104, 'This negative review is unfair to the author!', NOW() - INTERVAL '13 days', NOW() - INTERVAL '12 days', 1, 'dismissed'),
  (108, 107, 100, 'I think this comment is too harsh', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days', 1, 'dismissed'),
  (109, 108, 101, 'Rude comment about the author', NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days', 1, 'dismissed'),
  (110, 109, 104, 'Stop hating on popular books!', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', 1, 'dismissed');

-- RESOLVED REPORTS - Hidden (comment was hidden but kept in DB)
INSERT INTO comment_report (id, comment_id, reported_by, reason, created_at, resolved_at, resolved_by, resolution) VALUES
  (111, 110, 107, 'This comment insults other users and calls them idiots. Completely inappropriate.', NOW() - INTERVAL '9 days' + INTERVAL '1 hour', NOW() - INTERVAL '9 days', 1, 'hidden'),
  (112, 111, 108, 'Personal attack on the author. This crosses the line from criticism to harassment.', NOW() - INTERVAL '8 days' + INTERVAL '2 hours', NOW() - INTERVAL '8 days', 1, 'hidden'),
  (113, 112, 107, 'Blatant spam advertising external website', NOW() - INTERVAL '3 days' + INTERVAL '4 hours', NOW() - INTERVAL '3 days', 1, 'hidden');

-- Multiple reports on same comment (shows report aggregation)
INSERT INTO comment_report (id, comment_id, reported_by, reason, created_at, resolved_at, resolved_by, resolution) VALUES
  (114, 110, 108, 'Calling people idiots is not acceptable behavior', NOW() - INTERVAL '9 days' + INTERVAL '3 hours', NOW() - INTERVAL '9 days', 1, 'hidden');

-- ============================================
-- MODERATION LOG (Activity history)
-- ============================================
INSERT INTO moderation_log (id, action_type, target_type, target_id, performed_by, details, created_at) VALUES
  -- Resolved reports (dismissed)
  (100, 'resolve_report', 'report', 107, 1, '{"resolution": "dismissed", "commentPreview": "Honestly, I did not enjoy this book..."}', NOW() - INTERVAL '12 days'),
  (101, 'resolve_report', 'report', 108, 1, '{"resolution": "dismissed", "commentPreview": "I thought it was mediocre at best..."}', NOW() - INTERVAL '11 days'),
  (102, 'resolve_report', 'report', 109, 1, '{"resolution": "dismissed", "commentPreview": "The author clearly has never..."}', NOW() - INTERVAL '10 days'),
  (103, 'resolve_report', 'report', 110, 1, '{"resolution": "dismissed", "commentPreview": "I think this book is overrated..."}', NOW() - INTERVAL '9 days'),

  -- Hidden comments
  (104, 'hide_comment', 'comment', 110, 1, '{"reason": "Insulting other users and using inappropriate language", "commentPreview": "This book is garbage and anyone who likes it..."}', NOW() - INTERVAL '9 days'),
  (105, 'resolve_report', 'report', 111, 1, '{"resolution": "hidden", "commentPreview": "This book is garbage and anyone who likes it..."}', NOW() - INTERVAL '9 days'),

  (106, 'hide_comment', 'comment', 111, 1, '{"reason": "Excessive negativity and personal attack on author", "commentPreview": "The author should be ashamed..."}', NOW() - INTERVAL '8 days'),
  (107, 'resolve_report', 'report', 112, 1, '{"resolution": "hidden", "commentPreview": "The author should be ashamed..."}', NOW() - INTERVAL '8 days'),

  (108, 'hide_comment', 'comment', 112, 1, '{"reason": "Spam - promotional content", "commentPreview": "BUY CHEAP BOOKS AT..."}', NOW() - INTERVAL '3 days'),
  (109, 'resolve_report', 'report', 113, 1, '{"resolution": "hidden", "commentPreview": "BUY CHEAP BOOKS AT..."}', NOW() - INTERVAL '3 days'),

  -- Multiple reports on same comment resolved together
  (110, 'resolve_report', 'report', 114, 1, '{"resolution": "hidden", "commentPreview": "This book is garbage and anyone who likes it...", "note": "Multiple reports on same comment"}', NOW() - INTERVAL '9 days');

-- ============================================
-- SUMMARY
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Moderation Test Data Created ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Users: 9 test users (IDs 100-108)';
  RAISE NOTICE 'Works: 2 books with editions';
  RAISE NOTICE 'Comments: 22 comments in various states';
  RAISE NOTICE '  - Good comments: 6';
  RAISE NOTICE '  - Critical but valid: 4';
  RAISE NOTICE '  - Hidden comments: 3';
  RAISE NOTICE '  - Spam (pending): 3';
  RAISE NOTICE '  - Borderline (pending): 3';
  RAISE NOTICE '  - Other: 3';
  RAISE NOTICE 'Reports: 15 total';
  RAISE NOTICE '  - Pending: 7 (need review)';
  RAISE NOTICE '  - Dismissed: 4';
  RAISE NOTICE '  - Hidden: 4';
  RAISE NOTICE 'Activity Log: 11 entries';
  RAISE NOTICE '';
END $$;
