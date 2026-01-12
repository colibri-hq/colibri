-- Language-Aware Full-Text Search Enhancement
-- Adds language-specific PostgreSQL FTS configurations for better stemming and stop word handling.
-- Based on: https://peterullrich.com/complete-guide-to-full-text-search-with-postgres-and-ecto

-- 1. Add fts_config column to language table
alter table public.language
    add column if not exists fts_config text not null default 'simple';

comment on column public.language.fts_config is
    'PostgreSQL full-text search configuration name (e.g., english, german, simple).';

-- 2. Create immutable function to cast text to regconfig
-- This is needed because the built-in cast is not marked as immutable, which is required for generated columns.
create or replace function public.text_to_regconfig(config_name text)
returns regconfig
language sql immutable strict parallel safe as $$
    select coalesce(config_name, 'simple')::regconfig;
$$;

alter function public.text_to_regconfig(text) owner to postgres;

comment on function public.text_to_regconfig is
    'Casts a text FTS config name to regconfig. Immutable wrapper for use in generated columns.';

-- 3. Add fts_config column to book_chunk table
alter table public.book_chunk
    add column if not exists fts_config text not null default 'simple';

comment on column public.book_chunk.fts_config is
    'PostgreSQL full-text search configuration name (e.g., english, german, simple). Denormalized from edition language.';

-- 4. Drop and recreate the search_vector column with language-aware configuration
-- First drop the GIN index that depends on the column
drop index if exists idx_book_chunk_fts;

-- Drop the old search_vector column
alter table public.book_chunk
    drop column if exists search_vector;

-- Recreate with language-aware FTS config
alter table public.book_chunk
    add column search_vector tsvector generated always as (
        to_tsvector(public.text_to_regconfig(fts_config), content)
    ) stored;

comment on column public.book_chunk.search_vector is
    'Language-aware full-text search vector for content search queries.';

-- Recreate the GIN index
create index idx_book_chunk_fts on public.book_chunk using gin (search_vector);
