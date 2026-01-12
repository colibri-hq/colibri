-- Fix: Ensure pg_trgm extension is properly installed in the extensions schema
-- This extension is required for the similarity() function used in fuzzy matching

-- Create extensions schema if it doesn't exist
create schema if not exists extensions;

-- Install pg_trgm extension in the extensions schema
-- This provides the similarity() function for trigram-based text matching
create extension if not exists pg_trgm schema extensions;

-- Also ensure unaccent is installed (used by slugify function)
create extension if not exists unaccent schema extensions;
