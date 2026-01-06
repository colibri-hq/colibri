-- region Enrichment Results
-- Stores background metadata enrichment results for user review
create table public.enrichment_result
(
    id          uuid                                   not null default gen_random_uuid(),
    work_id     bigint                                 not null,
    user_id     bigint                                 not null,
    created_at  timestamp with time zone default now() not null,
    status      text                     default 'pending' not null,
    preview     jsonb                                  not null,
    improvements jsonb                                 not null,
    sources     text[]                   default '{}'  not null,
    applied_at  timestamp with time zone               null,
    dismissed_at timestamp with time zone              null
);

alter table public.enrichment_result
    owner to postgres;

comment on table public.enrichment_result is 'Stores metadata enrichment results from external providers for user review';
comment on column public.enrichment_result.work_id is 'Work that was enriched';
comment on column public.enrichment_result.user_id is 'User who initiated the import';
comment on column public.enrichment_result.status is 'Status: pending, applied, dismissed';
comment on column public.enrichment_result.preview is 'Full MetadataPreview from reconciliation system';
comment on column public.enrichment_result.improvements is 'Calculated delta of improvements vs current work data';
comment on column public.enrichment_result.sources is 'Names of providers that contributed data';
comment on column public.enrichment_result.applied_at is 'When improvements were applied to the work';
comment on column public.enrichment_result.dismissed_at is 'When user dismissed the improvements';

grant all on table public.enrichment_result to anon;
grant all on table public.enrichment_result to authenticated;
grant all on table public.enrichment_result to service_role;

alter table public.enrichment_result
    enable row level security;

alter table only public.enrichment_result
    add constraint enrichment_result_pkey primary key (id);

alter table only public.enrichment_result
    add constraint enrichment_result_work_id_fkey foreign key (work_id) references public.work (id)
        on update cascade on delete cascade;

alter table only public.enrichment_result
    add constraint enrichment_result_user_id_fkey foreign key (user_id) references authentication."user" (id)
        on update cascade on delete cascade;

alter table only public.enrichment_result
    add constraint enrichment_result_status_valid check (status in ('pending', 'applied', 'dismissed'));

-- Unique constraint: only one pending enrichment per work
create unique index idx_enrichment_result_work_pending
    on public.enrichment_result (work_id)
    where status = 'pending';

create index idx_enrichment_result_user on public.enrichment_result (user_id);
create index idx_enrichment_result_work on public.enrichment_result (work_id);
create index idx_enrichment_result_status on public.enrichment_result (status);
create index idx_enrichment_result_created on public.enrichment_result (created_at);

-- RLS Policies
create policy "Enable insert for authenticated users" on public.enrichment_result
    for insert to authenticated with check (true);
create policy "Enable select for authenticated users" on public.enrichment_result
    for select to authenticated using (true);
create policy "Enable update for authenticated users" on public.enrichment_result
    for update to authenticated using (true);
create policy "Enable delete for authenticated users" on public.enrichment_result
    for delete to authenticated using (true);
-- endregion
