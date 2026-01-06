-- region Pending Ingestion
create table public.pending_ingestion
(
    id                 uuid                                      not null default gen_random_uuid(),
    user_id            bigint                                    not null,
    upload_id          text                                      not null,
    s3_key             text                                      not null,
    checksum           text                                      not null,
    extracted_metadata jsonb                                     not null,
    duplicate_info     jsonb                                     not null,
    created_at         timestamp with time zone default now()    not null,
    expires_at         timestamp with time zone default now() + interval '24 hours' not null
);
alter table public.pending_ingestion
    owner to postgres;
comment on table public.pending_ingestion is 'Temporary storage for pending ingestion confirmations during duplicate detection';
comment on column public.pending_ingestion.user_id is 'User who initiated the upload';
comment on column public.pending_ingestion.upload_id is 'Client-side upload tracking ID';
comment on column public.pending_ingestion.s3_key is 'S3 key to retrieve the file if needed';
comment on column public.pending_ingestion.checksum is 'SHA-256 checksum as hex string';
comment on column public.pending_ingestion.extracted_metadata is 'Metadata extracted from the ebook';
comment on column public.pending_ingestion.duplicate_info is 'Information about detected duplicates';
comment on column public.pending_ingestion.expires_at is 'When this record should be automatically deleted';

grant all on table public.pending_ingestion to anon;
grant all on table public.pending_ingestion to authenticated;
grant all on table public.pending_ingestion to service_role;

alter table public.pending_ingestion
    enable row level security;

alter table only public.pending_ingestion
    add constraint pending_ingestion_pkey primary key (id);

alter table only public.pending_ingestion
    add constraint pending_ingestion_user_id_fkey foreign key (user_id) references authentication."user" (id)
        on update cascade on delete cascade;

alter table only public.pending_ingestion
    add constraint pending_ingestion_checksum_valid check (checksum ~ '^[a-f0-9]{64}$');

create index idx_pending_ingestion_user on public.pending_ingestion (user_id);
create index idx_pending_ingestion_expires on public.pending_ingestion (expires_at);
create index idx_pending_ingestion_created on public.pending_ingestion (created_at);

-- RLS Policies
-- Note: The application uses service role for database access, so these policies
-- primarily serve as documentation of intended access patterns.
create policy "Enable insert for authenticated users" on public.pending_ingestion for insert to authenticated with check (true);
create policy "Enable select for authenticated users" on public.pending_ingestion for select to authenticated using (true);
create policy "Enable delete for authenticated users" on public.pending_ingestion for delete to authenticated using (true);
-- endregion
