create type public.language_type as enum ( 'living', 'historical', 'extinct', 'constructed', 'special' );
alter type public.language_type owner to postgres;
comment on type public.language_type is 'An ISO 639-3 language type, as defined here: https://iso639-3.sil.org/about/types';

create table public.language
(
    iso_639_3  character(3)         not null,
    iso_639_1  character(2),
    type       public.language_type not null,
    name       text,
    fts_config text                 not null default 'simple'
);
alter table public.language
    owner to postgres;
comment on table public.language is 'A representation of all languages contained in ISO 639-3.';
comment on column public.language.fts_config is 'PostgreSQL full-text search configuration name (e.g., english, german, simple).';

grant all on table public.language to anon;
grant all on table public.language to authenticated;
grant all on table public.language to service_role;

alter table public.language
    enable row level security;
create policy "Enable read access for all users" on public.language for select using (true);

alter table only public.language
    add constraint language_pkey primary key (iso_639_3);

alter table only public.edition
    add constraint edition_language_fkey foreign key (language) references public.language (iso_639_3) on update cascade on delete set null;
