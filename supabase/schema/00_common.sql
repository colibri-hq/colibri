-- region Slugify Function
create extension if not exists unaccent schema public;
create function public.slugify(value text) returns text
    language plpgsql
    immutable strict set search_path to '' as
$_$
declare
    slug text;
begin
    -- removes accents (diacritic signs) from a given string --
    with "unaccented" as (select public.unaccent("slugify"."value") as "value"),
         "lowercase" as (select lower("unaccented"."value") as "value" from "unaccented"),
         "removed_quotes" as (select regexp_replace("lowercase"."value", '[''"]+', '', 'gi') as "value"
                              from "lowercase"),
         "hyphenated" as (select regexp_replace("removed_quotes"."value", '[^a-z0-9\\-_]+', '-', 'gi') as "value"
                          from "removed_quotes"),
         "trimmed" as (select regexp_replace(regexp_replace("hyphenated"."value", '-+$', ''), '^-', '') as "value"
                       from "hyphenated")
    select "trimmed"."value"
    from "trimmed"
    into slug;

    return slug;
end;
$_$;
alter function public.slugify(value text) owner to postgres;
grant all on function public.slugify(value text) to anon;
grant all on function public.slugify(value text) to authenticated;
grant all on function public.slugify(value text) to service_role;
-- endregion

-- region RGB Color Type
create type public.rgb_color as
(
    r integer,
    g integer,
    b integer
);
alter type public.rgb_color owner to postgres;
-- endregion

-- region URL Type
create domain public.url as text constraint url_check check ((VALUE ~
                                                              '^https?://[-a-zA-Z0-9@:%._+~#=]{2,255}.[a-z]{2,6}(/[-a-zA-Z0-9@:%._+~#=]*)*(?[-a-zA-Z0-9@:%_+.~#()?&//=]*)?$'::text));
alter domain public.url owner to postgres;
comment on domain public.url is 'Valid URLs';
-- endregion

-- region Extensions
create schema if not exists extensions;

-- Enable the `isn` extension for International Standard Number (ISN) support
create extension if not exists "isn" schema extensions;

-- Enable the `supabase_vault` extension for secure storage of sensitive data
create extension if not exists supabase_vault cascade;
-- endregion
