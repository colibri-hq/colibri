create table settings_revision
(
    version    int generated always as identity primary key,
    data       jsonb                                  not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    updated_by bigint                                 null
);

alter table settings_revision
    add constraint settings_revision_updated_by_user_id_fkey foreign key (updated_by) references authentication."user" (id) on delete set null on update cascade;

create view "settings" as
    select
        version,
        data,
        created_at,
        updated_at,
        updated_by
    from
        settings_revision
    order by version desc
    limit 1;
