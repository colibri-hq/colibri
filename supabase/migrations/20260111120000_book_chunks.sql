-- Book Chunks for Full-Text Search
-- Stores searchable content chunks extracted from ebook assets.

-- Create book_chunk table
create table if not exists public.book_chunk
(
    id             bigint generated always as identity primary key,
    asset_id       bigint                                 not null,
    content        text                                   not null,
    search_vector  tsvector generated always as (
        to_tsvector('simple', content)
    ) stored,
    source_pointer jsonb                                  not null,
    chunk_index    int                                    not null,
    created_at     timestamp with time zone default now() not null
);

alter table public.book_chunk
    owner to postgres;

comment on table public.book_chunk is 'Searchable content chunks extracted from ebook assets for full-text search.';
comment on column public.book_chunk.asset_id is 'Reference to the source asset file this chunk was extracted from.';
comment on column public.book_chunk.content is 'Plain text content of this chunk.';
comment on column public.book_chunk.search_vector is 'Full-text search vector for content search queries.';
comment on column public.book_chunk.source_pointer is 'Location pointer for deep linking to the chunk position in the source file.';
comment on column public.book_chunk.chunk_index is 'Sequential index of this chunk within the asset, used for ordering.';

-- Indexes
create index if not exists idx_book_chunk_asset on public.book_chunk (asset_id);
create index if not exists idx_book_chunk_fts on public.book_chunk using gin (search_vector);
create unique index if not exists idx_book_chunk_asset_index on public.book_chunk (asset_id, chunk_index);

-- Grants
grant all on table public.book_chunk to anon;
grant all on table public.book_chunk to authenticated;
grant all on table public.book_chunk to service_role;

-- RLS
alter table public.book_chunk
    enable row level security;

-- Foreign key to asset
alter table only public.book_chunk
    add constraint book_chunk_asset_id_fkey foreign key (asset_id)
        references public.asset (id) on update cascade on delete cascade;

-- Add search indexing status columns to asset table
alter table public.asset
    add column if not exists search_indexed_at timestamp with time zone,
    add column if not exists search_index_error text;

comment on column public.asset.search_indexed_at is 'Timestamp when the asset was last indexed for full-text search.';
comment on column public.asset.search_index_error is 'Error message if search indexing failed for this asset.';
