-- region Text to Regconfig Function
-- Immutable function to cast text to regconfig for use in generated columns.
-- Based on: https://peterullrich.com/complete-guide-to-full-text-search-with-postgres-and-ecto

create or replace function public.text_to_regconfig(config_name text)
returns regconfig
language sql immutable strict parallel safe as $$
    select coalesce(config_name, 'simple')::regconfig;
$$;

alter function public.text_to_regconfig(text) owner to postgres;

comment on function public.text_to_regconfig is
    'Casts a text FTS config name to regconfig. Immutable wrapper for use in generated columns.';
-- endregion

-- region Book Chunks
-- Full-text searchable content chunks extracted from ebook assets.
-- Each chunk represents a paragraph or section of text with a source pointer
-- for deep linking back to the original location in the ebook.

create table public.book_chunk
(
    id             bigint generated always as identity primary key,
    asset_id       bigint                                 not null,
    content        text                                   not null,
    fts_config     text                                   not null default 'simple',
    search_vector  tsvector generated always as (
        to_tsvector(public.text_to_regconfig(fts_config), content)
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
comment on column public.book_chunk.fts_config is 'PostgreSQL full-text search configuration name (e.g., english, german, simple). Denormalized from edition language.';
comment on column public.book_chunk.search_vector is 'Language-aware full-text search vector for content search queries.';
comment on column public.book_chunk.source_pointer is 'Location pointer for deep linking to the chunk position in the source file. Format varies by ebook type (EPUB CFI, MOBI record/offset, PDF page/offset).';
comment on column public.book_chunk.chunk_index is 'Sequential index of this chunk within the asset, used for ordering.';

-- Indexes
create index idx_book_chunk_asset on public.book_chunk (asset_id);
create index idx_book_chunk_fts on public.book_chunk using gin (search_vector);
create unique index idx_book_chunk_asset_index on public.book_chunk (asset_id, chunk_index);

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
-- endregion

-- region Asset Search Indexing Status
-- Add columns to track search indexing status for assets.

alter table public.asset
    add column if not exists search_indexed_at timestamp with time zone,
    add column if not exists search_index_error text;

comment on column public.asset.search_indexed_at is 'Timestamp when the asset was last indexed for full-text search.';
comment on column public.asset.search_index_error is 'Error message if search indexing failed for this asset.';
-- endregion
