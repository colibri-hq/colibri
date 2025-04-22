create table public.contribution
(
    creator_id bigint               not null,
    edition_id bigint               not null,
    type       text,
    essential  boolean default true not null
);
alter table public.contribution
    owner to postgres;
comment on table public.contribution is 'Junction table for collaborations of creators on book editions';
comment on column public.contribution.creator_id is 'Reference to a creator that contributed to the given edition of a book.';
comment on column public.contribution.edition_id is 'Reference to an edition of a book the given creator contributed to.';
comment on column public.contribution.type is 'The kind of contribution the creator made to the given book edition, e.g. "authored", "illustrated", or "co-authored".';
comment on column public.contribution.essential is 'Whether the contribution should be considered essential to the edition; non-essential contributors may not be displayed at all times.';

grant all on table public.contribution to anon;
grant all on table public.contribution to authenticated;
grant all on table public.contribution to service_role;

alter table public.contribution
    enable row level security;

alter table only public.contribution
    add constraint contribution_pkey primary key (creator_id, edition_id);
