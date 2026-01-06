-- region Search Vectors
-- Full-text search support using tsvector columns with GIN indexes.
-- Uses 'simple' configuration for language-agnostic matching.

-- Edition search: title (weight A) + synopsis (weight B)
alter table public.edition
    add column search_vector tsvector
        generated always as (
            setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('simple', coalesce(synopsis, '')), 'B')
        ) stored;

create index idx_edition_search on public.edition using gin (search_vector);

comment on column public.edition.search_vector is 'Full-text search vector combining title and synopsis for search queries.';

-- Creator search: name (weight A) + description (weight B)
alter table public.creator
    add column search_vector tsvector
        generated always as (
            setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
            setweight(to_tsvector('simple', coalesce(description, '')), 'B')
        ) stored;

create index idx_creator_search on public.creator using gin (search_vector);

comment on column public.creator.search_vector is 'Full-text search vector combining name and description for search queries.';

-- Publisher search: name (weight A) + description (weight B)
alter table public.publisher
    add column search_vector tsvector
        generated always as (
            setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
            setweight(to_tsvector('simple', coalesce(description, '')), 'B')
        ) stored;

create index idx_publisher_search on public.publisher using gin (search_vector);

comment on column public.publisher.search_vector is 'Full-text search vector combining name and description for search queries.';

-- Collection search: name (weight A) + description (weight B)
alter table public.collection
    add column search_vector tsvector
        generated always as (
            setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
            setweight(to_tsvector('simple', coalesce(description, '')), 'B')
        ) stored;

create index idx_collection_search on public.collection using gin (search_vector);

comment on column public.collection.search_vector is 'Full-text search vector combining name and description for search queries.';
-- endregion
