set statement_timeout = 0;
set lock_timeout = 0;
set idle_in_transaction_session_timeout = 0;
set client_encoding = 'UTF8';
set standard_conforming_strings = on;
select pg_catalog.set_config('search_path', '', false);
set check_function_bodies = false;
set xmloption = content;
set client_min_messages = warning;
set row_security = off;
create schema if not exists "authentication";
alter schema "authentication" owner to "postgres";
create schema if not exists "extensions";
alter schema "extensions" owner to "postgres";
create schema if not exists "public";
alter schema "public" owner to "pg_database_owner";
comment on schema "public" is 'standard public schema';

create type "authentication"."color_scheme" as enum ( 'system', 'light', 'dark' );
alter type "authentication"."color_scheme" owner to "postgres";
comment on type "authentication"."color_scheme" is 'The color scheme for the application, used to control light/dark mode.';

create type "authentication"."pkce_challenge_method" as enum ( 'S256' );
alter type "authentication"."pkce_challenge_method" owner to "postgres";
comment on type "authentication"."pkce_challenge_method" is 'The PKCE challenge method used to generate the code challenge.';
create type "authentication"."user_role" as enum ( 'admin', 'adult', 'child', 'guest' );
alter type "authentication"."user_role" owner to "postgres";
comment on type "authentication"."user_role" is 'An authorization role for a user.';

create type "authentication"."webauthn_transport" as enum ( 'usb', 'nfc', 'ble', 'smart-card', 'hybrid', 'internal', 'cable' );
alter type "authentication"."webauthn_transport" owner to "postgres";
comment on type "authentication"."webauthn_transport" is 'A transport identifier as per the WebAuthn Level 3 specification, section 5.8.4';

create type "public"."contribution_role" as enum ( 'abr', 'acp', 'act', 'adi', 'adp', 'aft', 'anc', 'anl', 'anm', 'ann', 'ant', 'ape', 'apl', 'app', 'aqt', 'arc', 'ard', 'arr', 'art', 'asg', 'asn', 'ato', 'att', 'auc', 'aud', 'aue', 'aui', 'aup', 'aus', 'aut', 'bdd', 'bjd', 'bka', 'bkd', 'bkp', 'blw', 'bnd', 'bpd', 'brd', 'brl', 'bsl', 'cad', 'cas', 'ccp', 'chr', 'cli', 'cll', 'clr', 'clt', 'cmm', 'cmp', 'cmt', 'cnd', 'cng', 'cns', 'coe', 'col', 'com', 'con', 'cop', 'cor', 'cos', 'cot', 'cou', 'cov', 'cpc', 'cpe', 'cph', 'cpl', 'cpt', 'cre', 'crp', 'crr', 'crt', 'csl', 'csp', 'cst', 'ctb', 'cte', 'ctg', 'ctr', 'cts', 'ctt', 'cur', 'cwt', 'dbd', 'dbp', 'dfd', 'dfe', 'dft', 'dgc', 'dgg', 'dgs', 'dis', 'djo', 'dln', 'dnc', 'dnr', 'dpc', 'dpt', 'drm', 'drt', 'dsr', 'dst', 'dtc', 'dte', 'dtm', 'dto', 'dub', 'edc', 'edd', 'edm', 'edt', 'egr', 'elg', 'elt', 'eng', 'enj', 'etr', 'evp', 'exp', 'fac', 'fds', 'fld', 'flm', 'fmd', 'fmk', 'fmo', 'fmp', 'fnd', 'fon', 'fpy', 'frg', 'gdv', 'gis', 'his', 'hnr', 'hst', 'ill', 'ilu', 'ins', 'inv', 'isb', 'itr', 'ive', 'ivr', 'jud', 'jug', 'lbr', 'lbt', 'ldr', 'led', 'lee', 'lel', 'len', 'let', 'lgd', 'lie', 'lil', 'lit', 'lsa', 'lse', 'lso', 'ltg', 'ltr', 'lyr', 'mcp', 'mdc', 'med', 'mfp', 'mfr', 'mka', 'mod', 'mon', 'mrb', 'mrk', 'msd', 'mte', 'mtk', 'mup', 'mus', 'mxe', 'nan', 'nrt', 'onp', 'opn', 'org', 'orm', 'osp', 'oth', 'own', 'pad', 'pan', 'pat', 'pbd', 'pbl', 'pdr', 'pfr', 'pht', 'plt', 'pma', 'pmn', 'pop', 'ppm', 'ppt', 'pra', 'prc', 'prd', 'pre', 'prf', 'prg', 'prm', 'prn', 'pro', 'prp', 'prs', 'prt', 'prv', 'pta', 'pte', 'ptf', 'pth', 'ptt', 'pup', 'rap', 'rbr', 'rcd', 'rce', 'rcp', 'rdd', 'red', 'ren', 'res', 'rev', 'rpc', 'rps', 'rpt', 'rpy', 'rse', 'rsg', 'rsp', 'rsr', 'rst', 'rth', 'rtm', 'rxa', 'sad', 'sce', 'scl', 'scr', 'sde', 'sds', 'sec', 'sfx', 'sgd', 'sgn', 'sht', 'sll', 'sng', 'spk', 'spn', 'spy', 'srv', 'std', 'stg', 'stl', 'stm', 'stn', 'str', 'swd', 'tau', 'tcd', 'tch', 'ths', 'tld', 'tlg', 'tlh', 'tlp', 'trc', 'trl', 'tyd', 'tyg', 'uvp', 'vac', 'vdg', 'vfx', 'wac', 'wal', 'wam', 'wat', 'wdc', 'wde', 'wfs', 'wft', 'win', 'wit', 'wpr', 'wst', 'wts' );
alter type "public"."contribution_role" owner to "postgres";
comment on type "public"."contribution_role" is 'The role of a creator in the creation of a resource, such as a book or edition. See: https://www.loc.gov/marc/relators/relaterm.html';

create type "public"."language_type" as enum ( 'living', 'historical', 'extinct', 'constructed', 'special' );
alter type "public"."language_type" owner to "postgres";
comment on type "public"."language_type" is 'An ISO 639-3 language type, as defined here: https://iso639-3.sil.org/about/types';

create type "public"."rgb_color" as
(
    "r" integer,
    "g" integer,
    "b" integer
);
alter type "public"."rgb_color" owner to "postgres";
create domain "public"."url" as "text" constraint "url_check" check ((VALUE ~
                                                                      '^https?://[-a-zA-Z0-9@:%._+~#=]{2,255}.[a-z]{2,6}(/[-a-zA-Z0-9@:%._+~#=]*)*(?[-a-zA-Z0-9@:%_+.~#()?&//=]*)?$'::"text"));
alter domain "public"."url" owner to "postgres";
comment on domain "public"."url" is 'Valid URLs';

create or replace function "authentication"."validate_authenticator"("authenticator_id" character varying) returns boolean
    language "plpgsql"
    security definer set "search_path" to '' as
$$
begin
    return exists (select 1 from authentication.authenticator a where a.identifier = authenticator_id);
end;
$$;
alter function "authentication"."validate_authenticator"("authenticator_id" character varying) owner to "postgres";
create or replace function "authentication"."validate_challenge"("value" character varying) returns boolean
    language "plpgsql"
    security definer set "search_path" to '' as
$$
begin
    return exists (select 1 from authentication.challenge c where challenge = value);
end;
$$;
alter function "authentication"."validate_challenge"("value" character varying) owner to "postgres";
create or replace function "extensions"."grant_pg_cron_access"() returns "event_trigger"
    language "plpgsql" as
$$
begin
    if exists (select
               from pg_event_trigger_ddl_commands() as ev
                        join pg_extension as ext on ev.objid = ext.oid
               where ext.extname = 'pg_cron') then
        grant usage on schema cron to postgres with grant option;

        alter default privileges in schema cron grant all on tables to postgres with grant option;
        alter default privileges in schema cron grant all on functions to postgres with grant option;
        alter default privileges in schema cron grant all on sequences to postgres with grant option;

        alter default privileges for user supabase_admin in schema cron grant all on sequences to postgres with grant option;
        alter default privileges for user supabase_admin in schema cron grant all on tables to postgres with grant option;
        alter default privileges for user supabase_admin in schema cron grant all on functions to postgres with grant option;

        grant all privileges on all tables in schema cron to postgres with grant option;
        revoke all on table cron.job from postgres;
        grant select on table cron.job to postgres with grant option;
    end if;
end;
$$;
alter function "extensions"."grant_pg_cron_access"() owner to "postgres";
comment on function "extensions"."grant_pg_cron_access"() is 'Grants access to pg_cron';

create or replace function "extensions"."grant_pg_graphql_access"() returns "event_trigger"
    language "plpgsql" as
$_$
declare
    func_is_graphql_resolve bool;
begin
    func_is_graphql_resolve = (select n.proname = 'resolve'
                               from pg_event_trigger_ddl_commands() as ev
                                        left join pg_catalog.pg_proc as n on ev.objid = n.oid);

    if func_is_graphql_resolve then
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        drop function if exists graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        ) returns jsonb
            language sql as
        $$
        select graphql.resolve(query := query, variables := coalesce(variables, '{}'),
                               "operationName" := "operationName", extensions := extensions);
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    end if;
end;
$_$;
alter function "extensions"."grant_pg_graphql_access"() owner to "supabase_admin";
comment on function "extensions"."grant_pg_graphql_access"() is 'Grants access to pg_graphql';

create or replace function "extensions"."grant_pg_net_access"() returns "event_trigger"
    language "plpgsql" as
$$
begin
    if exists (select 1
               from pg_event_trigger_ddl_commands() as ev
                        join pg_extension as ext on ev.objid = ext.oid
               where ext.extname = 'pg_net') then
        grant usage on schema net to supabase_functions_admin, postgres, anon, authenticated, service_role;

        alter function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) security definer;
        alter function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) security definer;

        alter function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) set search_path = net;
        alter function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) set search_path = net;

        revoke all on function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) from public;
        revoke all on function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) from public;

        grant execute on function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) to supabase_functions_admin, postgres, anon, authenticated, service_role;
        grant execute on function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) to supabase_functions_admin, postgres, anon, authenticated, service_role;
    end if;
end;
$$;
alter function "extensions"."grant_pg_net_access"() owner to "postgres";
comment on function "extensions"."grant_pg_net_access"() is 'Grants access to pg_net';

create or replace function "extensions"."pgrst_ddl_watch"() returns "event_trigger"
    language "plpgsql" as
$$
declare
    cmd record;
begin
    for cmd in select * from pg_event_trigger_ddl_commands()
        loop
            if cmd.command_tag in
               ('CREATE SCHEMA', 'ALTER SCHEMA', 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE',
                'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE', 'CREATE VIEW', 'ALTER VIEW', 'CREATE MATERIALIZED VIEW',
                'ALTER MATERIALIZED VIEW', 'CREATE FUNCTION', 'ALTER FUNCTION', 'CREATE TRIGGER', 'CREATE TYPE',
                'ALTER TYPE', 'CREATE RULE', 'COMMENT'
                   )
                -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
                and cmd.schema_name is distinct from 'pg_temp' then
                notify pgrst, 'reload schema';
            end if;
        end loop;
end;
$$;
alter function "extensions"."pgrst_ddl_watch"() owner to "supabase_admin";
create or replace function "extensions"."pgrst_drop_watch"() returns "event_trigger"
    language "plpgsql" as
$$
declare
    obj record;
begin
    for obj in select * from pg_event_trigger_dropped_objects()
        loop
            if obj.object_type in
               ('schema', 'table', 'foreign table', 'view', 'materialized view', 'function', 'trigger', 'type', 'rule'
                   ) and obj.is_temporary is false -- no pg_temp objects
            then
                notify pgrst, 'reload schema';
            end if;
        end loop;
end;
$$;
alter function "extensions"."pgrst_drop_watch"() owner to "supabase_admin";
create or replace function "extensions"."set_graphql_placeholder"() returns "event_trigger"
    language "plpgsql" as
$_$
declare
    graphql_is_dropped bool;
begin
    graphql_is_dropped = (select ev.schema_name = 'graphql_public'
                          from pg_event_trigger_dropped_objects() as ev
                          where ev.schema_name = 'graphql_public');

    if graphql_is_dropped then create or replace function graphql_public.graphql(
        "operationName" text default null,
        query text default null,
        variables jsonb default null,
        extensions jsonb default null
    ) returns jsonb
        language plpgsql as
    $$
    declare
        server_version float;
    begin
        server_version = (select (split_part((select version()), ' ', 2))::float);

        if server_version >= 14 then
            return jsonb_build_object('errors',
                                      jsonb_build_array(jsonb_build_object('message', 'pg_graphql extension is not enabled.')));
        else
            return jsonb_build_object('errors', jsonb_build_array(jsonb_build_object('message',
                                                                                     'pg_graphql is only available on projects running Postgres 14 onwards.')));
        end if;
    end;
    $$;
    end if;

end;
$_$;
alter function "extensions"."set_graphql_placeholder"() owner to "supabase_admin";
comment on function "extensions"."set_graphql_placeholder"() is 'Reintroduces placeholder function for graphql_public.graphql';

create or replace function "public"."slugify"("value" "text") returns "text"
    language "plpgsql"
    immutable strict set "search_path" to '' as
$_$
declare
    slug text;
begin
    -- removes accents (diacritic signs) from a given string --
    with "unaccented" as (select extensions.unaccent("slugify"."value") as "value"),
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
alter function "public"."slugify"("value" "text") owner to "postgres";

set default_tablespace = '';

set default_table_access_method = "heap";
create table if not exists "authentication"."access_token"
(
    "id"         bigint                                   not null,
    "user_id"    bigint,
    "client_id"  "text"                                   not null,
    "scopes"     "text"[]                                 not null,
    "revoked_at" timestamp with time zone,
    "expires_at" timestamp with time zone                 not null,
    "created_at" timestamp with time zone default "now"() not null,
    "token"      "text"                                   not null
);
alter table "authentication"."access_token"
    owner to "postgres";
comment on table "authentication"."access_token" is 'OAuth Access Tokens issued by the identity provider.';

comment on column "authentication"."access_token"."user_id" is 'User ID the access token belongs to. Will be NULL for service tokens.';

comment on column "authentication"."access_token"."token" is 'The access token value.';

alter table "authentication"."access_token"
    alter column "id" add generated by default as identity ( sequence name "authentication"."access_token_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "authentication"."authenticator"
(
    "id"           bigint                                       not null,
    "handle"       "text",
    "agent"        "text",
    "type"         "text",
    "public_key"   "text"                                       not null,
    "identifier"   character varying                            not null,
    "device_type"  "text"                                       not null,
    "transports"   "authentication"."webauthn_transport"[]      not null,
    "counter"      bigint                   default '0'::bigint not null,
    "backed_up"    boolean                  default false       not null,
    "created_at"   timestamp with time zone default "now"()     not null,
    "updated_at"   timestamp with time zone,
    "last_used_at" timestamp with time zone,
    "user_id"      bigint                                       not null
);
alter table "authentication"."authenticator"
    owner to "postgres";
comment on table "authentication"."authenticator" is 'WebAuthn Authenticator instances';

alter table "authentication"."authenticator"
    alter column "id" add generated by default as identity ( sequence name "authentication"."authenticator_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "authentication"."authorization_code"
(
    "id"               bigint                                                                                            not null,
    "code"             "text"                                                                                            not null,
    "client_id"        "text"                                                                                            not null,
    "user_id"          bigint                                                                                            not null,
    "scopes"           "text"[]                                                                                          not null,
    "used_at"          timestamp with time zone,
    "revoked"          boolean                                  default false                                            not null,
    "expires_at"       timestamp with time zone                                                                          not null,
    "created_at"       timestamp with time zone                 default "now"()                                          not null,
    "redirect_uri"     "text"                                                                                            not null,
    "challenge"        "text"                                                                                            not null,
    "challenge_method" "authentication"."pkce_challenge_method" default 'S256'::"authentication"."pkce_challenge_method" not null
);
alter table "authentication"."authorization_code"
    owner to "postgres";
comment on table "authentication"."authorization_code" is 'OAuth authorization codes that can be exchanged for an access token.';

comment on column "authentication"."authorization_code"."code" is 'Actual authorization code value.';

comment on column "authentication"."authorization_code"."scopes" is 'Effective OAuth scopes granted by the user to the client which generated this authorization code.';

comment on column "authentication"."authorization_code"."used_at" is 'Timestamp when this authorization code has been used by a client to issue an access token, and thus cannot be used anymore.';

comment on column "authentication"."authorization_code"."revoked" is 'Whether this authorization code has been revoked and cannot be used anymore.';

comment on column "authentication"."authorization_code"."redirect_uri" is 'Redirect URI where the response will be sent.';

comment on column "authentication"."authorization_code"."challenge" is 'The PKCE code challenge associated with the authorization code.';

alter table "authentication"."authorization_code"
    alter column "id" add generated by default as identity ( sequence name "authentication"."authorization_code_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "authentication"."authorization_request"
(
    "id"                    bigint                                               not null,
    "identifier"            "uuid"                   default "gen_random_uuid"() not null,
    "client_id"             "text"                                               not null,
    "response_type"         "text"                                               not null,
    "redirect_uri"          "text"                                               not null,
    "scopes"                "text"[],
    "state"                 "text",
    "code_challenge"        "text"                                               not null,
    "code_challenge_method" "text"                                               not null,
    "created_at"            timestamp with time zone default "now"()             not null,
    "expires_at"            timestamp with time zone                             not null,
    "used_at"               timestamp with time zone
);
alter table "authentication"."authorization_request"
    owner to "postgres";
comment on table "authentication"."authorization_request" is 'Authorization requests as created via the Pushed Authorization Request defined in RFC 9126.';

comment on column "authentication"."authorization_request"."expires_at" is 'TImestamp the authorization request expires.';

comment on column "authentication"."authorization_request"."used_at" is 'Timestamp the authorization request has been used.';

alter table "authentication"."authorization_request"
    alter column "id" add generated by default as identity ( sequence name "authentication"."authorization_request_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "authentication"."challenge"
(
    "id"                 bigint                                   not null,
    "challenge"          "text"                                   not null,
    "session_identifier" "text"                                   not null,
    "created_at"         timestamp with time zone default "now"() not null,
    "expires_at"         timestamp with time zone                 not null
);
alter table "authentication"."challenge"
    owner to "postgres";
comment on table "authentication"."challenge" is 'WebAuthn Authenticator Challenges';

alter table "authentication"."challenge"
    alter column "id" add generated by default as identity ( sequence name "authentication"."challenge_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "authentication"."client"
(
    "id"            "text"                                   not null,
    "redirect_uris" "text"[],
    "secret"        "text",
    "name"          "text",
    "description"   "text",
    "user_id"       bigint,
    "created_at"    timestamp with time zone default "now"() not null,
    "updated_at"    timestamp with time zone,
    "personal"      boolean                  default false   not null,
    "revoked"       boolean                  default false   not null,
    "active"        boolean                  default true    not null,
    constraint "client_id_check" check (("id" ~ '^[a-zA-Z][a-zA-Z0-9:-]*[a-zA-Z0-9]$'::"text"))
);
alter table "authentication"."client"
    owner to "postgres";
comment on table "authentication"."client" is 'OAuth clients';

comment on column "authentication"."client"."id" is 'Alphanumeric ID of the client.';

comment on column "authentication"."client"."redirect_uris" is 'OAuth Redirect URIs registered for this client. A server-side client must not have any redirect URIs, otherwise it cannot be used with the client_credentials grant.';

comment on column "authentication"."client"."secret" is 'OAuth client secret for this client. Must be NULL unless intended for server-side clients (which may only use the client_credentials grant type).';

comment on column "authentication"."client"."user_id" is 'Owner of this client. Must be NULL for system clients, which cannot be modified in the user interface and will skip the permission dialogs.';

comment on column "authentication"."client"."personal" is 'Whether this client is only available to its owner. Must be FALSE for system clients.';

comment on column "authentication"."client"."revoked" is 'Whether the client has been revoked. Any token or authorization code issued by the client will also be regarded as revoked.';

comment on column "authentication"."client"."active" is 'Whether the client is in active use. Inactive clients will not be able to issue access tokens.';

create table if not exists "authentication"."client_scope"
(
    "client_id" "text" not null,
    "scope_id"  "text" not null
);
alter table "authentication"."client_scope"
    owner to "postgres";
comment on table "authentication"."client_scope" is 'OAuth scopes available to specific clients.';

create table if not exists "authentication"."device_challenge"
(
    "id"           bigint                                   not null,
    "user_code"    "text"                                   not null,
    "device_code"  "text"                                   not null,
    "client_id"    "text"                                   not null,
    "approved"     boolean,
    "last_poll_at" timestamp with time zone,
    "expires_at"   timestamp with time zone                 not null,
    "created_at"   timestamp with time zone default "now"() not null,
    "scopes"       "text"[],
    "used_at"      timestamp with time zone,
    constraint "device_challenge_user_code_check" check (("length"("user_code") <= 8))
);
alter table "authentication"."device_challenge"
    owner to "postgres";
comment on table "authentication"."device_challenge" is 'OAuth Device Grant Challenges';

comment on column "authentication"."device_challenge"."user_code" is 'Verification code the user has to enter on the device screen; should be short (usually 6-8 numbers and/or letters). Maximum of 8 characters for usability reasons.';

comment on column "authentication"."device_challenge"."device_code" is 'Verification code for this challenge as generated by the authorization server.';

comment on column "authentication"."device_challenge"."client_id" is 'ID of the client that created the challenge.';

comment on column "authentication"."device_challenge"."approved" is 'Whether the challenge has been approved by the user (true), denied (false), or is still pending (NULL).';

comment on column "authentication"."device_challenge"."last_poll_at" is 'Last time the client has polled for the current challenge status, used to prevent abuse. Will be NULL if the client has not polled yet.';

comment on column "authentication"."device_challenge"."expires_at" is 'Expiration time of this device challenge.';

comment on column "authentication"."device_challenge"."created_at" is 'Creation time of this device challenge.';

comment on column "authentication"."device_challenge"."scopes" is 'Optional set of scopes requested by the client for this specific challenge. Only used if a subset of the available client scopes is provided.';

comment on column "authentication"."device_challenge"."used_at" is 'Timestamp when the device code has been used to issue an access token, and thus cannot be used anymore. ';

alter table "authentication"."device_challenge"
    alter column "id" add generated by default as identity ( sequence name "authentication"."device_challenge_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "authentication"."passcode"
(
    "id"         bigint                                   not null,
    "created_at" timestamp with time zone default "now"() not null,
    "expires_at" timestamp with time zone                 not null,
    "code"       character varying                        not null,
    "user_id"    bigint                                   not null
);
alter table "authentication"."passcode"
    owner to "postgres";
comment on table "authentication"."passcode" is 'One-time authentication passcodes';

alter table "authentication"."passcode"
    alter column "id" add generated by default as identity ( sequence name "authentication"."passcode_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "authentication"."refresh_token"
(
    "id"         bigint                                   not null,
    "token"      "text"                                   not null,
    "user_id"    bigint,
    "client_id"  "text"                                   not null,
    "scopes"     "text"[]                                 not null,
    "revoked_at" timestamp with time zone,
    "expires_at" timestamp with time zone                 not null,
    "created_at" timestamp with time zone default "now"() not null
);
alter table "authentication"."refresh_token"
    owner to "postgres";
comment on table "authentication"."refresh_token" is 'OAuth Refresh Tokens issued by the identity provider.';

comment on column "authentication"."refresh_token"."user_id" is 'User ID the refresh token belongs to. Will be NULL for service tokens.';

alter table "authentication"."refresh_token"
    alter column "id" add generated by default as identity ( sequence name "authentication"."refresh_token_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "authentication"."scope"
(
    "id"          "text"                                   not null,
    "description" "text",
    "created_at"  timestamp with time zone default "now"() not null,
    "server"      boolean                  default false   not null,
    constraint "scope_id_check" check (("id" ~ '^[a-zA-Z][a-zA-Z0-9:_-]*[a-zA-Z0-9]$'::"text"))
);
alter table "authentication"."scope"
    owner to "postgres";
comment on table "authentication"."scope" is 'OAuth scopes';

comment on column "authentication"."scope"."id" is 'Name of the scope. Must';

comment on column "authentication"."scope"."server" is 'Whether this scope is only available to server-side client integrations using the client_credentials grant.';

create table if not exists "authentication"."user"
(
    "id"           bigint                                                                        not null,
    "created_at"   timestamp with time zone        default "now"()                               not null,
    "updated_at"   timestamp with time zone,
    "name"         character varying,
    "email"        character varying                                                             not null,
    "verified"     boolean                         default false                                 not null,
    "birthdate"    "date",
    "role"         "authentication"."user_role"    default 'adult'::"authentication"."user_role" not null,
    "color_scheme" "authentication"."color_scheme" default 'system'::"authentication"."color_scheme"
);
alter table "authentication"."user"
    owner to "postgres";
comment on table "authentication"."user" is 'Application users';

comment on column "authentication"."user"."birthdate" is 'The birthdate of a user. This is used to automatically apply age restrictions, if the user has the child role.';

comment on column "authentication"."user"."role" is 'The authorization role of a user.';

comment on column "authentication"."user"."color_scheme" is 'Preferred color scheme to display the application in.';

create table if not exists "authentication"."user_consent"
(
    "user_id"    bigint                                   not null,
    "client_id"  "text"                                   not null,
    "granted_at" timestamp with time zone default "now"() not null,
    "expires_at" timestamp with time zone                 not null,
    "revoked_at" timestamp with time zone,
    "scopes"     "text"[]                                 not null
);
alter table "authentication"."user_consent"
    owner to "postgres";
comment on table "authentication"."user_consent" is 'User consent granted to OAuth clients.';

comment on column "authentication"."user_consent"."granted_at" is 'Timestamp the user has granted consent to the client.';

comment on column "authentication"."user_consent"."expires_at" is 'Timestamp of consent expiration. To avoid indefinitely granting consent to a client, users have to reconfirm their choices after a given amount of time.';

comment on column "authentication"."user_consent"."revoked_at" is 'Timestamp the user revoked their consent for the client. Effectively the same as having never given consent at all. If NULL, the user did not revoke their consent yet.';

comment on column "authentication"."user_consent"."scopes" is 'Scopes the user has granted the client to use at the time of consent.';

alter table "authentication"."user_consent"
    alter column "user_id" add generated by default as identity ( sequence name "authentication"."user_consent_user_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

alter table "authentication"."user"
    alter column "id" add generated by default as identity ( sequence name "authentication"."user_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."asset"
(
    "id"         bigint                                         not null,
    "created_at" timestamp with time zone default "now"()       not null,
    "updated_at" timestamp with time zone,
    "edition_id" bigint                                         not null,
    "filename"   "text"                                         not null,
    "checksum"   "bytea"                                        not null,
    "size"       integer                                        not null,
    "media_type" "text"                                         not null,
    "metadata"   "jsonb"                  default '{}'::"jsonb" not null,
    "updated_by" bigint,
    "created_by" bigint,
    constraint "asset_metadata_check" check (("jsonb_typeof"("metadata") = 'object'::"text"))
);
alter table "public"."asset"
    owner to "postgres";
alter table "public"."asset"
    alter column "id" add generated by default as identity ( sequence name "public"."asset_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."catalog"
(
    "id"                   bigint                                         not null,
    "feed_url"             "text"                                         not null,
    "title"                "text",
    "description"          "text",
    "image_url"            "text",
    "url"                  "text",
    "updated_by"           bigint,
    "updated_at"           timestamp with time zone,
    "created_at"           timestamp with time zone default "now"()       not null,
    "age_requirement"      smallint                 default '0'::smallint not null,
    "active"               boolean                  default true          not null,
    "color"                "public"."rgb_color",
    "credentials_required" boolean                  default false         not null,
    constraint "catalog_age_requirement_check" check (("age_requirement" >= 0))
);
alter table "public"."catalog"
    owner to "postgres";
comment on table "public"."catalog" is 'An OPDS catalog to list books from.';

comment on column "public"."catalog"."feed_url" is 'The OPDS feed URL to retrieve this catalog.';

comment on column "public"."catalog"."title" is 'Name of this feed; usually retrieved from the title entry of the feed itself.';

comment on column "public"."catalog"."description" is 'Description of this feed; usually retrieved from the summary entry of the feed itself.';

comment on column "public"."catalog"."image_url" is 'An optional URL to an image representing the feed; usually retrieved from the thumbnail image link of the feed itself.';

comment on column "public"."catalog"."url" is 'The website of the feed provider.';

comment on column "public"."catalog"."age_requirement" is 'The minimum required age to access this catalog';

comment on column "public"."catalog"."active" is 'Whether this catalog is currently active and used in the app.';

alter table "public"."catalog"
    alter column "id" add generated by default as identity ( sequence name "public"."catalog_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."collection"
(
    "id"              bigint                                         not null,
    "name"            "text"                                         not null,
    "color"           "bytea",
    "emoji"           "text",
    "description"     "text",
    "age_requirement" smallint                 default '0'::smallint not null,
    "shared"          boolean                  default true          not null,
    "updated_by"      bigint,
    "updated_at"      timestamp with time zone,
    "created_by"      bigint,
    "created_at"      timestamp with time zone default "now"()       not null,
    constraint "collection_age_requirement_check" check (("age_requirement" >= 0)),
    constraint "collection_name_check" check (("length"("name") < 151))
);
alter table "public"."collection"
    owner to "postgres";
comment on table "public"."collection" is 'A collection of books created by a user';

comment on column "public"."collection"."name" is 'Mandatory collection name. Must be less than 150 characters.';

comment on column "public"."collection"."color" is 'Optional hex color to tint this collection. Does not allow transparency (which will be applied by the application).';

comment on column "public"."collection"."emoji" is 'Optional emoji to represent this collection, acting as an icon.';

comment on column "public"."collection"."description" is 'Optional long-form description of this collection formatted as Markdown.';

comment on column "public"."collection"."age_requirement" is 'Minimum age in years users must reach to access this collection. This obviously will only work if a birthdate has been set for a user.';

comment on column "public"."collection"."shared" is 'Shared collections are accessible by all users; personal collections (shared is false) are only visible to the user who created them.';

create table if not exists "public"."collection_comment"
(
    "collection_id" bigint not null,
    "comment_id"    bigint not null
);
alter table "public"."collection_comment"
    owner to "postgres";
comment on table "public"."collection_comment" is 'Junction table for comments on collections.';

alter table "public"."collection_comment"
    alter column "collection_id" add generated by default as identity ( sequence name "public"."collection_comment_collection_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."collection_entry"
(
    "collection_id" bigint                                   not null,
    "work_id"       bigint                                   not null,
    "edition_id"    bigint                                   not null,
    "position"      integer                                  not null,
    "updated_by"    bigint,
    "updated_at"    timestamp with time zone,
    "created_by"    bigint,
    "created_at"    timestamp with time zone default "now"() not null
);
alter table "public"."collection_entry"
    owner to "postgres";
comment on table "public"."collection_entry" is 'Junction table for books in a collection.';

comment on column "public"."collection_entry"."work_id" is 'Reference to the book this entry refers to. Unless a specific edition is referenced in `edition_id`, the main edition will be used.';

comment on column "public"."collection_entry"."edition_id" is 'Optional specific edition of a book to add. This is useful to create a collection of audio books, for example. If not set, the main edition of the book will be used.';

comment on column "public"."collection_entry"."position" is 'Order position of the collection entry. Applies to all users. To change the position, a reordering of all other collection entries is required.';

alter table "public"."collection"
    alter column "id" add generated by default as identity ( sequence name "public"."collection_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."collection_tag"
(
    "collection_id" bigint not null,
    "tag_id"        bigint not null
);
alter table "public"."collection_tag"
    owner to "postgres";
comment on table "public"."collection_tag" is 'Junction table for collection tags';

alter table "public"."collection_tag"
    alter column "collection_id" add generated by default as identity ( sequence name "public"."collection_tag_collection_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."comment"
(
    "id"         bigint                                   not null,
    "content"    "text"                                   not null,
    "updated_at" timestamp with time zone,
    "created_by" bigint,
    "created_at" timestamp with time zone default "now"() not null
);
alter table "public"."comment"
    owner to "postgres";
comment on table "public"."comment" is 'A comment on a book, a creator, a series, a publisher, or a collection.';

alter table "public"."comment"
    alter column "id" add generated by default as identity ( sequence name "public"."comment_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."comment_reaction"
(
    "comment_id" bigint                                   not null,
    "user_id"    bigint                                   not null,
    "emoji"      "text"                                   not null,
    "created_at" timestamp with time zone default "now"() not null
);
alter table "public"."comment_reaction"
    owner to "postgres";
comment on table "public"."comment_reaction" is 'A single emoji reaction of a user to a comment.';

create table if not exists "public"."settings_revision"
(
    "version"    integer                                  not null,
    "data"       "jsonb"                                  not null,
    "created_at" timestamp with time zone default "now"() not null,
    "updated_at" timestamp with time zone default "now"() not null,
    "updated_by" bigint
);
alter table "public"."settings_revision"
    owner to "postgres";
alter table "public"."settings_revision"
    alter column "version" add generated always as identity ( sequence name "public"."config_version_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."contribution"
(
    "creator_id" bigint                                                                   not null,
    "edition_id" bigint                                                                   not null,
    "role"       "public"."contribution_role" default 'aut'::"public"."contribution_role" not null,
    "essential"  boolean                      default true                                not null
);
alter table "public"."contribution"
    owner to "postgres";
comment on table "public"."contribution" is 'Junction table for collaborations of creators on book editions';

comment on column "public"."contribution"."creator_id" is 'Reference to a creator that contributed to the given edition of a book.';

comment on column "public"."contribution"."edition_id" is 'Reference to an edition of a book the given creator contributed to.';

comment on column "public"."contribution"."role" is 'The role the creator had in the creation of the given book edition, e.g. "aut" (Author) or "ill" (Illustrator).';

comment on column "public"."contribution"."essential" is 'Whether the contribution should be considered essential to the edition; non-essential contributors may not be displayed at all times.';

create table if not exists "public"."cover"
(
    "id"          bigint                                         not null,
    "filename"    "text"                                         not null,
    "description" "text",
    "media_type"  "text"                                         not null,
    "width"       smallint                                       not null,
    "height"      smallint                                       not null,
    "size"        integer                                        not null,
    "metadata"    "jsonb"                  default '{}'::"jsonb" not null,
    "updated_by"  bigint,
    "updated_at"  timestamp with time zone,
    "created_by"  bigint,
    "created_at"  timestamp with time zone default "now"()       not null,
    "checksum"    "bytea"                                        not null,
    "blurhash"    "text"                                         not null,
    constraint "cover_metadata_check" check (("jsonb_typeof"("metadata") = 'object'::"text"))
);
alter table "public".image
    owner to "postgres";
comment on table "public".image is 'Book cover images';

comment on column "public".image."filename" is 'Name, or key, of the file as persisted to the storage bucket.';

comment on column "public".image."description" is 'A human-readable description of the image intended for visually impaired users.';

comment on column "public".image."media_type" is 'A media type string describing the type of image file (e.g. "image/png" for a PNG file).';

comment on column "public".image."width" is 'Width of the image, in pixels.';

comment on column "public".image."height" is 'Height of the image, in pixels.';

comment on column "public".image."size" is 'Size of the file, in bytes.';

comment on column "public".image."metadata" is 'JSON object containing image file metadata.';

comment on column "public".image."checksum" is 'An SHA1 hash of the file, used for ETag headers and sanity checks.';

comment on column "public".image."blurhash" is 'A blurhash representation of the image; see https://blurha.sh/. Blurhashes are simple string representations of an image that can be used to render a blurred approximation of the original image.';

create table if not exists "public"."cover_creator"
(
    "cover_id"   bigint               not null,
    "creator_id" bigint               not null,
    "essential"  boolean default true not null
);
alter table "public".image_creator
    owner to "postgres";
comment on table "public".image_creator is 'Junction table for contributions to book edition covers by creators.';

alter table "public".image_creator
    alter column image_id add generated by default as identity ( sequence name "public".image_creator_image_id_seq start with 1 increment by 1 no minvalue no maxvalue cache 1 );

alter table "public".image
    alter column "id" add generated by default as identity ( sequence name "public".image_id_seq start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."creator"
(
    "id"            bigint                                   not null,
    "name"          "text"                                   not null,
    "description"   "text",
    "url"           "text",
    "wikipedia_url" "text",
    "goodreads_id"  character varying,
    "amazon_id"     character varying,
    "image"         "text",
    "updated_by"    bigint,
    "created_at"    timestamp with time zone default "now"() not null,
    "updated_at"    timestamp with time zone,
    "sorting_key"   "text"
);
alter table "public"."creator"
    owner to "postgres";
comment on table "public"."creator" is 'A creator contributes something to a specific edition of a book; that''s the author, obviously, but also illustrators or translators, for example, or narrators for audio books.';

comment on column "public"."creator"."name" is 'Full name of the creator.';

comment on column "public"."creator"."description" is 'Description, or biography, of a creator (e.g. an author). Free-text, providing more information on a given creator. Should be provided as Markdown.';

comment on column "public"."creator"."url" is 'Link to the website operated by, or another location on the internet representative of, the creator.';

create table if not exists "public"."creator_comment"
(
    "creator_id" bigint not null,
    "comment_id" bigint not null
);
alter table "public"."creator_comment"
    owner to "postgres";
comment on table "public"."creator_comment" is 'Junction table for comments on creators.';

alter table "public"."creator_comment"
    alter column "creator_id" add generated by default as identity ( sequence name "public"."creator_comment_creator_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

alter table "public"."creator"
    alter column "id" add generated by default as identity ( sequence name "public"."creator_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."edition"
(
    "id"                bigint                                   not null,
    "work_id"           bigint,
    "format"            "text",
    "title"             "text"                                   not null,
    "binding"           "text",
    "synopsis"          "text",
    "excerpt"           "text",
    "pages"             smallint,
    "isbn_10"           "extensions"."isbn",
    "isbn_13"           "extensions"."isbn13",
    "publisher_id"      bigint,
    "published_at"      "date",
    "updated_by"        bigint,
    "updated_at"        timestamp with time zone,
    "created_at"        timestamp with time zone default "now"() not null,
    "language"          "bpchar",
    "sorting_key"       "text",
    "cover_id"          bigint,
    "legal_information" "text",
    "asin"              character(10),
    constraint "check_edition_asin" check (("asin" ~ '^[A-Z0-9]{10}$'::"text"))
);
alter table "public"."edition"
    owner to "postgres";
comment on table "public"."edition" is 'An edition of a book';

comment on column "public"."edition"."title" is 'Title of this edition of the book.';

comment on column "public"."edition"."binding" is 'Type of binding of this edition of the book (e.g. "hardcover").';

comment on column "public"."edition"."synopsis" is 'Synopsis of this edition of the book.';

comment on column "public"."edition"."excerpt" is 'An excerpt from the content of the book.';

comment on column "public"."edition"."pages" is 'Number of pages in this edition of the book.';

comment on column "public"."edition"."isbn_10" is 'Legacy ISBN-10 identifier of this edition of the book.';

comment on column "public"."edition"."isbn_13" is 'Modern ISBN-13 identifier of this edition of the book.';

comment on column "public"."edition"."publisher_id" is 'Reference to the publisher of this edition of the book.';

comment on column "public"."edition"."published_at" is 'Date the edition of the book has been published.';

comment on column "public"."edition"."sorting_key" is 'A version of the book title intended to used for sorting a list of books (e.g. "Prisoner of Azkaban, the").';

comment on column "public"."edition"."legal_information" is 'Any legal information associated with this edition of a book, for example on copyright holders or usage permissions.';

comment on column "public"."edition"."asin" is 'Amazon Standard Identification Number (ASIN) of this edition of the book. This is a 10-character alphanumeric identifier.';

alter table "public"."edition"
    alter column "id" add generated by default as identity ( sequence name "public"."edition_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."language"
(
    "iso_639_3" character(3)             not null,
    "iso_639_1" character(2),
    "type"      "public"."language_type" not null,
    "name"      character varying
);
alter table "public"."language"
    owner to "postgres";
comment on table "public"."language" is 'A representation of all languages contained in ISO 639-3.';

create table if not exists "public"."publisher"
(
    "id"            bigint                                   not null,
    "name"          character varying                        not null,
    "sorting_key"   character varying                        not null,
    "description"   "text",
    "image"         character varying,
    "url"           character varying,
    "wikipedia_url" character varying,
    "updated_by"    bigint,
    "updated_at"    timestamp with time zone,
    "created_at"    timestamp with time zone default "now"() not null
);
alter table "public"."publisher"
    owner to "postgres";
comment on table "public"."publisher" is 'A company publishing books.';

create table if not exists "public"."publisher_comment"
(
    "publisher_id" bigint not null,
    "comment_id"   bigint not null
);
alter table "public"."publisher_comment"
    owner to "postgres";
comment on table "public"."publisher_comment" is 'Junction table for comments on publishers.';

alter table "public"."publisher_comment"
    alter column "publisher_id" add generated by default as identity ( sequence name "public"."publisher_comment_publisher_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

alter table "public"."publisher"
    alter column "id" add generated by default as identity ( sequence name "public"."publisher_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."review"
(
    "id"               bigint                                   not null,
    "edition_id"       bigint                                   not null,
    "content"          "text"                                   not null,
    "reviewer_id"      bigint,
    "publication_name" "text",
    "published_at"     "date",
    "updated_by"       bigint,
    "updated_at"       timestamp with time zone,
    "created_at"       timestamp with time zone default "now"() not null,
    "url"              "text",
    "excerpt"          "text",
    constraint "review_excerpt_check" check (("length"("excerpt") < 201))
);
alter table "public"."review"
    owner to "postgres";
comment on table "public"."review" is 'A published book review.';

comment on column "public"."review"."edition_id" is 'Reference to the edition of a book this review refers to.';

comment on column "public"."review"."content" is 'Full content of the review, formatted as Markdown.';

comment on column "public"."review"."reviewer_id" is 'Reference to an existing creator that published the review. This is useful for reviews by another author, for example.';

comment on column "public"."review"."publication_name" is 'Name of the publication the review has been published in (e.g. "New York Times", "NPR").';

comment on column "public"."review"."published_at" is 'Date the review has been published.';

comment on column "public"."review"."url" is 'URL of the page the review has been published at.';

comment on column "public"."review"."excerpt" is 'An excerpt from the full review as provided in content. Must not be longer than 200 characters.';

alter table "public"."review"
    alter column "id" add generated by default as identity ( sequence name "public"."review_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."series"
(
    "id"         bigint                                   not null,
    "name"       "text",
    "updated_by" bigint,
    "updated_at" timestamp with time zone,
    "created_at" timestamp with time zone default "now"() not null,
    "language"   "bpchar"
);
alter table "public"."series"
    owner to "postgres";
comment on column "public"."series"."name" is 'Name of the series of books.';

create table if not exists "public"."series_comment"
(
    "series_id"  bigint not null,
    "comment_id" bigint
);
alter table "public"."series_comment"
    owner to "postgres";
comment on table "public"."series_comment" is 'Junction table for comments on series.';

alter table "public"."series_comment"
    alter column "series_id" add generated by default as identity ( sequence name "public"."series_comment_series_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."series_entry"
(
    "work_id"   bigint not null,
    "series_id" bigint not null,
    "position"  smallint
);
alter table "public"."series_entry"
    owner to "postgres";
comment on column "public"."series_entry"."position" is 'Position of the given boko in the series.';

alter table "public"."series_entry"
    alter column "work_id" add generated by default as identity ( sequence name "public"."series_entry_work_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

alter table "public"."series"
    alter column "id" add generated by default as identity ( sequence name "public"."series_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."series_tag"
(
    "series_id" bigint not null,
    "tag_id"    bigint not null
);
alter table "public"."series_tag"
    owner to "postgres";
comment on table "public"."series_tag" is 'Junction table for series tags';

alter table "public"."series_tag"
    alter column "series_id" add generated by default as identity ( sequence name "public"."series_tag_series_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create or replace view "public"."settings" as
select "settings_revision"."version",
       "settings_revision"."data",
       "settings_revision"."created_at",
       "settings_revision"."updated_at",
       "settings_revision"."updated_by"
from "public"."settings_revision"
order by "settings_revision"."version" desc
limit 1;
alter table "public"."settings"
    owner to "postgres";
create table if not exists "public"."tag"
(
    "id"         bigint                                   not null,
    "value"      "text"                                   not null,
    "color"      "text",
    "emoji"      "text",
    "created_by" bigint,
    "created_at" timestamp with time zone default "now"() not null
);
alter table "public"."tag"
    owner to "postgres";
comment on table "public"."tag" is 'Tags for collections, books, series, and creators';

alter table "public"."tag"
    alter column "id" add generated by default as identity ( sequence name "public"."tag_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."user_collection_favorite"
(
    "user_id"       bigint not null,
    "collection_id" bigint not null
);
alter table "public"."user_collection_favorite"
    owner to "postgres";
comment on table "public"."user_collection_favorite" is 'Junction table for favorite user collections.';

alter table "public"."user_collection_favorite"
    alter column "user_id" add generated by default as identity ( sequence name "public"."user_collection_favorite_user_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."user_creator_favorite"
(
    "user_id"    bigint not null,
    "creator_id" bigint not null
);
alter table "public"."user_creator_favorite"
    owner to "postgres";
comment on table "public"."user_creator_favorite" is 'Junction table for favorite creators.';

alter table "public"."user_creator_favorite"
    alter column "user_id" add generated by default as identity ( sequence name "public"."user_creator_favorite_user_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."work"
(
    "id"              bigint                                   not null,
    "created_at"      timestamp with time zone default "now"() not null,
    "updated_at"      timestamp with time zone,
    "updated_by"      bigint,
    "main_edition_id" bigint,
    "created_by"      bigint
);
alter table "public"."work"
    owner to "postgres";
comment on table "public"."work" is 'Container for a set of editions of the same book. Represented by a single edition.';

comment on column "public"."work"."main_edition_id" is 'The main, or preferred, edition of a book. Represents the book in listings and collections.';

create table if not exists "public"."work_comment"
(
    "work_id"    bigint not null,
    "comment_id" bigint not null
);
alter table "public"."work_comment"
    owner to "postgres";
comment on table "public"."work_comment" is 'Junction table for comments on books.';

alter table "public"."work_comment"
    alter column "work_id" add generated by default as identity ( sequence name "public"."work_comment_work_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

alter table "public"."work"
    alter column "id" add generated by default as identity ( sequence name "public"."work_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."work_rating"
(
    "user_id"    bigint                                   not null,
    "work_id"    bigint                                   not null,
    "rating"     smallint                                 not null,
    "created_at" timestamp with time zone default "now"() not null
);
alter table "public"."work_rating"
    owner to "postgres";
comment on table "public"."work_rating" is 'Junction table for a user''s rating for a book.';

alter table "public"."work_rating"
    alter column "work_id" add generated by default as identity ( sequence name "public"."work_rating_work_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

create table if not exists "public"."work_tag"
(
    "work_id" bigint not null,
    "tag_id"  bigint not null
);
alter table "public"."work_tag"
    owner to "postgres";
comment on table "public"."work_tag" is 'Junction table for book tags';

alter table "public"."work_tag"
    alter column "work_id" add generated by default as identity ( sequence name "public"."work_tag_work_id_seq" start with 1 increment by 1 no minvalue no maxvalue cache 1 );

alter table only "authentication"."access_token"
    add constraint "access_token_pkey" primary key ("id");

alter table only "authentication"."authenticator"
    add constraint "authenticator_pkey" primary key ("id");

alter table only "authentication"."authorization_code"
    add constraint "authorization_code_pkey" primary key ("id");

alter table only "authentication"."authorization_request"
    add constraint "authorization_request_pkey" primary key ("id");

alter table only "authentication"."challenge"
    add constraint "challenge_pkey" primary key ("id");

alter table only "authentication"."client"
    add constraint "client_pkey" primary key ("id");

alter table only "authentication"."client"
    add constraint "client_redirect_uris_key" unique ("redirect_uris");

alter table only "authentication"."client_scope"
    add constraint "client_scopes_pkey" primary key ("client_id", "scope_id");

alter table only "authentication"."device_challenge"
    add constraint "device_challenge_pkey" primary key ("id");

alter table only "authentication"."passcode"
    add constraint "passcode_pkey" primary key ("id");

alter table only "authentication"."passcode"
    add constraint "passcode_user_id_key" unique ("user_id");

alter table only "authentication"."refresh_token"
    add constraint "refresh_token_pkey" primary key ("id");

alter table only "authentication"."refresh_token"
    add constraint "refresh_token_token_key" unique ("token");

alter table only "authentication"."scope"
    add constraint "scope_pkey" primary key ("id");

alter table only "authentication"."user_consent"
    add constraint "user_consent_pkey" primary key ("user_id", "client_id");

alter table only "authentication"."user"
    add constraint "user_email_key" unique ("email");

alter table only "authentication"."user"
    add constraint "user_pkey" primary key ("id");

alter table only "public"."asset"
    add constraint "asset_pkey" primary key ("id");

alter table only "public"."catalog"
    add constraint "catalog_pkey" primary key ("id");

alter table only "public"."collection_comment"
    add constraint "collection_comment_pkey" primary key ("collection_id", "comment_id");

alter table only "public"."collection_entry"
    add constraint "collection_entry_pkey" primary key ("collection_id", "work_id", "edition_id");

alter table only "public"."collection"
    add constraint "collection_pkey" primary key ("id");

alter table only "public"."collection_tag"
    add constraint "collection_tag_pkey" primary key ("collection_id", "tag_id");

alter table only "public"."comment"
    add constraint "comment_pkey" primary key ("id");

alter table only "public"."comment_reaction"
    add constraint "comment_reaction_pkey" primary key ("comment_id", "user_id");

alter table only "public"."settings_revision"
    add constraint "config_pkey" primary key ("version");

alter table only "public"."contribution"
    add constraint "contribution_pkey" primary key ("creator_id", "edition_id");

alter table only "public".image_creator
    add constraint "cover_creator_pkey" primary key (image_id, "creator_id");

alter table only "public".image
    add constraint "cover_filename_key" unique ("filename");

alter table only "public".image
    add constraint "cover_pkey" primary key ("id");

alter table only "public"."creator_comment"
    add constraint "creator_comment_pkey" primary key ("creator_id", "comment_id");

alter table only "public"."creator"
    add constraint "creator_pkey" primary key ("id");

alter table only "public"."edition"
    add constraint "edition_asin_key" unique ("asin");

alter table only "public"."edition"
    add constraint "edition_pkey" primary key ("id");

alter table only "public"."language"
    add constraint "language_pkey" primary key ("iso_639_3");

alter table only "public"."publisher_comment"
    add constraint "publisher_comment_pkey" primary key ("publisher_id", "comment_id");

alter table only "public"."publisher"
    add constraint "publisher_pkey" primary key ("id");

alter table only "public"."review"
    add constraint "review_pkey" primary key ("id");

alter table only "public"."series_comment"
    add constraint "series_comment_pkey" primary key ("series_id");

alter table only "public"."series_entry"
    add constraint "series_entry_pkey" primary key ("work_id", "series_id");

alter table only "public"."series"
    add constraint "series_pkey" primary key ("id");

alter table only "public"."series_tag"
    add constraint "series_tag_pkey" primary key ("series_id", "tag_id");

alter table only "public"."tag"
    add constraint "tag_pkey" primary key ("id");

alter table only "public"."user_collection_favorite"
    add constraint "user_collection_favorite_pkey" primary key ("user_id", "collection_id");

alter table only "public"."user_creator_favorite"
    add constraint "user_creator_favorite_pkey" primary key ("user_id", "creator_id");

alter table only "public"."work_comment"
    add constraint "work_comment_pkey" primary key ("work_id", "comment_id");

alter table only "public"."work"
    add constraint "work_pkey" primary key ("id");

alter table only "public"."work_rating"
    add constraint "work_rating_pkey" primary key ("user_id", "work_id");

alter table only "public"."work_tag"
    add constraint "work_tag_pkey" primary key ("work_id", "tag_id");

alter table only "authentication"."access_token"
    add constraint "access_token_client_id_fkey" foreign key ("client_id") references "authentication"."client" ("id") on update cascade on delete cascade;

alter table only "authentication"."access_token"
    add constraint "access_token_user_id_fkey" foreign key ("user_id") references "authentication"."user" ("id") on update cascade on delete cascade;

alter table only "authentication"."authenticator"
    add constraint "authentication_authenticator_user_id_fkey" foreign key ("user_id") references "authentication"."user" ("id") on update cascade on delete cascade;

alter table only "authentication"."passcode"
    add constraint "authentication_passcode_user_id_fkey" foreign key ("user_id") references "authentication"."user" ("id") on update cascade on delete cascade;

alter table only "authentication"."authorization_code"
    add constraint "authorization_code_client_id_fkey" foreign key ("client_id") references "authentication"."client" ("id") on update cascade on delete cascade;

alter table only "authentication"."authorization_code"
    add constraint "authorization_code_user_id_fkey" foreign key ("user_id") references "authentication"."user" ("id") on update cascade on delete cascade;

alter table only "authentication"."authorization_request"
    add constraint "authorization_request_client_id_fkey" foreign key ("client_id") references "authentication"."client" ("id") on update cascade on delete cascade;

alter table only "authentication"."client_scope"
    add constraint "client_scopes_client_id_fkey" foreign key ("client_id") references "authentication"."client" ("id") on update cascade on delete cascade;

alter table only "authentication"."client_scope"
    add constraint "client_scopes_scope_id_fkey" foreign key ("scope_id") references "authentication"."scope" ("id") on update cascade on delete cascade;

alter table only "authentication"."client"
    add constraint "client_user_id_fkey" foreign key ("user_id") references "authentication"."user" ("id") on update cascade on delete cascade;

alter table only "authentication"."device_challenge"
    add constraint "device_challenge_client_id_fkey" foreign key ("client_id") references "authentication"."client" ("id") on update cascade on delete cascade;

alter table only "authentication"."refresh_token"
    add constraint "refresh_token_client_id_fkey" foreign key ("client_id") references "authentication"."client" ("id") on update cascade on delete cascade;

alter table only "authentication"."refresh_token"
    add constraint "refresh_token_user_id_fkey" foreign key ("user_id") references "authentication"."user" ("id") on update cascade on delete cascade;

alter table only "authentication"."user_consent"
    add constraint "user_consent_client_id_fkey" foreign key ("client_id") references "authentication"."client" ("id") on update cascade on delete cascade;

alter table only "authentication"."user_consent"
    add constraint "user_consent_user_id_fkey" foreign key ("user_id") references "authentication"."user" ("id") on update cascade on delete cascade;

alter table only "public"."asset"
    add constraint "asset_created_by_fkey" foreign key ("created_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."asset"
    add constraint "asset_edition_id_fkey" foreign key ("edition_id") references "public"."edition" ("id") on update cascade on delete set null;

alter table only "public"."asset"
    add constraint "asset_updated_by_fkey" foreign key ("updated_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."catalog"
    add constraint "catalog_updated_by_fkey" foreign key ("updated_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."collection_comment"
    add constraint "collection_comment_collection_id_fkey" foreign key ("collection_id") references "public"."collection" ("id") on update cascade on delete cascade;

alter table only "public"."collection_comment"
    add constraint "collection_comment_comment_id_fkey" foreign key ("comment_id") references "public"."comment" ("id") on update cascade on delete cascade;

alter table only "public"."collection"
    add constraint "collection_created_by_fkey" foreign key ("created_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."collection_entry"
    add constraint "collection_entry_collection_id_fkey" foreign key ("collection_id") references "public"."collection" ("id") on update cascade on delete cascade;

alter table only "public"."collection_entry"
    add constraint "collection_entry_created_by_fkey" foreign key ("created_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."collection_entry"
    add constraint "collection_entry_edition_id_fkey" foreign key ("edition_id") references "public"."edition" ("id") on update cascade on delete set null;

alter table only "public"."collection_entry"
    add constraint "collection_entry_updated_by_fkey" foreign key ("updated_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."collection_entry"
    add constraint "collection_entry_work_id_fkey" foreign key ("work_id") references "public"."work" ("id") on update cascade on delete cascade;

alter table only "public"."collection_tag"
    add constraint "collection_tag_collection_id_fkey" foreign key ("collection_id") references "public"."collection" ("id") on update cascade on delete cascade;

alter table only "public"."collection_tag"
    add constraint "collection_tag_tag_id_fkey" foreign key ("tag_id") references "public"."tag" ("id") on update cascade on delete cascade;

alter table only "public"."collection"
    add constraint "collection_updated_by_fkey" foreign key ("updated_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."comment"
    add constraint "comment_created_by_fkey" foreign key ("created_by") references "authentication"."user" ("id") on update cascade on delete cascade;

alter table only "public"."comment_reaction"
    add constraint "comment_reaction_comment_id_fkey" foreign key ("comment_id") references "public"."comment" ("id") on update cascade on delete cascade;

alter table only "public"."comment_reaction"
    add constraint "comment_reaction_user_id_fkey" foreign key ("user_id") references "authentication"."user" ("id") on update cascade on delete cascade;

alter table only "public"."contribution"
    add constraint "contribution_creator_id_fkey" foreign key ("creator_id") references "public"."creator" ("id") on update cascade on delete cascade;

alter table only "public"."contribution"
    add constraint "contribution_edition_id_fkey" foreign key ("edition_id") references "public"."edition" ("id") on update cascade on delete cascade;

alter table only "public".image
    add constraint "cover_created_by_fkey" foreign key ("created_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public".image_creator
    add constraint "cover_creator_cover_id_fkey" foreign key (image_id) references "public".image ("id") on update cascade on delete cascade;

alter table only "public".image_creator
    add constraint "cover_creator_creator_id_fkey" foreign key ("creator_id") references "public"."creator" ("id") on update cascade on delete cascade;

alter table only "public".image
    add constraint "cover_updated_by_fkey" foreign key ("updated_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."creator_comment"
    add constraint "creator_comment_comment_id_fkey" foreign key ("comment_id") references "public"."comment" ("id") on update cascade on delete cascade;

alter table only "public"."creator_comment"
    add constraint "creator_comment_creator_id_fkey" foreign key ("creator_id") references "public"."creator" ("id") on update cascade on delete cascade;

alter table only "public"."creator"
    add constraint "creator_updated_by_fkey" foreign key ("updated_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."edition"
    add constraint "edition_cover_id_fkey" foreign key (cover_image_id) references "public".image ("id") on update cascade on delete set null;

alter table only "public"."edition"
    add constraint "edition_language_fkey" foreign key ("language") references "public"."language" ("iso_639_3") on update cascade on delete set null;

alter table only "public"."edition"
    add constraint "edition_publisher_id_fkey" foreign key ("publisher_id") references "public"."publisher" ("id") on update cascade on delete set null;

alter table only "public"."edition"
    add constraint "edition_updated_by_fkey" foreign key ("updated_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."edition"
    add constraint "edition_work_id_fkey" foreign key ("work_id") references "public"."work" ("id") on update cascade on delete cascade;

alter table only "public"."publisher_comment"
    add constraint "publisher_comment_comment_id_fkey" foreign key ("comment_id") references "public"."comment" ("id") on update cascade on delete cascade;

alter table only "public"."publisher_comment"
    add constraint "publisher_comment_publisher_id_fkey" foreign key ("publisher_id") references "public"."publisher" ("id") on update cascade on delete cascade;

alter table only "public"."publisher"
    add constraint "publisher_updated_by_fkey" foreign key ("updated_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."review"
    add constraint "review_edition_id_fkey" foreign key ("edition_id") references "public"."edition" ("id") on update cascade on delete cascade;

alter table only "public"."review"
    add constraint "review_reviewer_id_fkey" foreign key ("reviewer_id") references "public"."creator" ("id") on update cascade on delete set null;

alter table only "public"."review"
    add constraint "review_updated_by_fkey" foreign key ("updated_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."series_comment"
    add constraint "series_comment_comment_id_fkey" foreign key ("comment_id") references "public"."comment" ("id") on update cascade on delete cascade;

alter table only "public"."series_comment"
    add constraint "series_comment_series_id_fkey" foreign key ("series_id") references "public"."series" ("id") on update cascade on delete cascade;

alter table only "public"."series_entry"
    add constraint "series_entry_series_id_fkey" foreign key ("series_id") references "public"."series" ("id") on update cascade on delete cascade;

alter table only "public"."series_entry"
    add constraint "series_entry_work_id_fkey" foreign key ("work_id") references "public"."work" ("id") on update cascade on delete cascade;

alter table only "public"."series"
    add constraint "series_language_fkey" foreign key ("language") references "public"."language" ("iso_639_3") on update cascade on delete set null;

alter table only "public"."series_tag"
    add constraint "series_tag_series_id_fkey" foreign key ("series_id") references "public"."series" ("id") on update cascade on delete cascade;

alter table only "public"."series_tag"
    add constraint "series_tag_tag_id_fkey" foreign key ("tag_id") references "public"."tag" ("id") on update cascade on delete cascade;

alter table only "public"."series"
    add constraint "series_updated_by_fkey" foreign key ("updated_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."settings_revision"
    add constraint "settings_revision_user_id_fkey" foreign key ("updated_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."tag"
    add constraint "tag_created_by_fkey" foreign key ("created_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."user_collection_favorite"
    add constraint "user_collection_favorite_collection_id_fkey" foreign key ("collection_id") references "public"."collection" ("id") on update cascade on delete cascade;

alter table only "public"."user_collection_favorite"
    add constraint "user_collection_favorite_user_id_fkey" foreign key ("user_id") references "authentication"."user" ("id") on update cascade on delete cascade;

alter table only "public"."user_creator_favorite"
    add constraint "user_creator_favorite_creator_id_fkey" foreign key ("creator_id") references "public"."creator" ("id") on update cascade on delete cascade;

alter table only "public"."user_creator_favorite"
    add constraint "user_creator_favorite_user_id_fkey" foreign key ("user_id") references "authentication"."user" ("id") on update cascade on delete cascade;

alter table only "public"."work_comment"
    add constraint "work_comment_comment_id_fkey" foreign key ("comment_id") references "public"."comment" ("id") on update cascade on delete cascade;

alter table only "public"."work_comment"
    add constraint "work_comment_work_id_fkey" foreign key ("work_id") references "public"."work" ("id") on update cascade on delete cascade;

alter table only "public"."work"
    add constraint "work_created_by_fkey" foreign key ("created_by") references "authentication"."user" ("id") on update cascade on delete set null;

alter table only "public"."work"
    add constraint "work_main_edition_id_fkey" foreign key ("main_edition_id") references "public"."edition" ("id") on update cascade on delete set null;

alter table only "public"."work_rating"
    add constraint "work_rating_user_id_fkey" foreign key ("user_id") references "authentication"."user" ("id") on update cascade on delete cascade;

alter table only "public"."work_rating"
    add constraint "work_rating_work_id_fkey" foreign key ("work_id") references "public"."work" ("id") on update cascade on delete cascade;

alter table only "public"."work_tag"
    add constraint "work_tag_tag_id_fkey" foreign key ("tag_id") references "public"."tag" ("id") on update cascade on delete cascade;

alter table only "public"."work_tag"
    add constraint "work_tag_work_id_fkey" foreign key ("work_id") references "public"."work" ("id") on update cascade on delete cascade;

alter table only "public"."work"
    add constraint "work_updated_by_fkey" foreign key ("updated_by") references "authentication"."user" ("id") on update cascade on delete set null;

create policy "Allow authenticated users to add new Webauthn devices" on "authentication"."authenticator" for insert to "authenticated" with check (true);

create policy "Allow creating challenges for all users" on "authentication"."challenge" for insert with check (true);

create policy "Allow reading own authenticator details" on "authentication"."authenticator" for select using ("authentication"."validate_authenticator"("identifier"));

create policy "Allow reading own challenges" on "authentication"."challenge" for select using ("authentication"."validate_challenge"(("challenge")::character varying));

alter table "authentication"."access_token"
    enable row level security;
alter table "authentication"."authenticator"
    enable row level security;
alter table "authentication"."authorization_code"
    enable row level security;
alter table "authentication"."authorization_request"
    enable row level security;
alter table "authentication"."challenge"
    enable row level security;
alter table "authentication"."client"
    enable row level security;
alter table "authentication"."client_scope"
    enable row level security;
alter table "authentication"."device_challenge"
    enable row level security;
alter table "authentication"."passcode"
    enable row level security;
alter table "authentication"."refresh_token"
    enable row level security;
alter table "authentication"."scope"
    enable row level security;
alter table "authentication"."user"
    enable row level security;
alter table "authentication"."user_consent"
    enable row level security;
create policy "Enable read access for all users" on "public"."language" for select using (true);

alter table "public"."asset"
    enable row level security;
alter table "public"."catalog"
    enable row level security;
alter table "public"."collection"
    enable row level security;
alter table "public"."collection_comment"
    enable row level security;
alter table "public"."collection_entry"
    enable row level security;
alter table "public"."collection_tag"
    enable row level security;
alter table "public"."comment"
    enable row level security;
alter table "public"."comment_reaction"
    enable row level security;
alter table "public"."contribution"
    enable row level security;
alter table "public".image
    enable row level security;
alter table "public".image_creator
    enable row level security;
alter table "public"."creator"
    enable row level security;
alter table "public"."creator_comment"
    enable row level security;
alter table "public"."edition"
    enable row level security;
alter table "public"."language"
    enable row level security;
alter table "public"."publisher"
    enable row level security;
alter table "public"."publisher_comment"
    enable row level security;
alter table "public"."review"
    enable row level security;
alter table "public"."series"
    enable row level security;
alter table "public"."series_comment"
    enable row level security;
alter table "public"."series_entry"
    enable row level security;
alter table "public"."series_tag"
    enable row level security;
alter table "public"."tag"
    enable row level security;
alter table "public"."user_collection_favorite"
    enable row level security;
alter table "public"."user_creator_favorite"
    enable row level security;
alter table "public"."work"
    enable row level security;
alter table "public"."work_comment"
    enable row level security;
alter table "public"."work_rating"
    enable row level security;
alter table "public"."work_tag"
    enable row level security;
grant usage on schema "authentication" to "anon";
grant usage on schema "authentication" to "authenticated";
grant usage on schema "authentication" to "service_role";

grant usage on schema "extensions" to "anon";
grant usage on schema "extensions" to "authenticated";
grant usage on schema "extensions" to "service_role";
grant all on schema "extensions" to "dashboard_user";

grant usage on schema "public" to "postgres";
grant usage on schema "public" to "anon";
grant usage on schema "public" to "authenticated";
grant usage on schema "public" to "service_role";

grant all on function "authentication"."validate_authenticator"("authenticator_id" character varying) to "anon";
grant all on function "authentication"."validate_authenticator"("authenticator_id" character varying) to "authenticated";
grant all on function "authentication"."validate_authenticator"("authenticator_id" character varying) to "service_role";

grant all on function "authentication"."validate_challenge"("value" character varying) to "anon";
grant all on function "authentication"."validate_challenge"("value" character varying) to "authenticated";
grant all on function "authentication"."validate_challenge"("value" character varying) to "service_role";

revoke all on function "extensions"."grant_pg_cron_access"() from "postgres";
grant all on function "extensions"."grant_pg_cron_access"() to "postgres" with grant option;
grant all on function "extensions"."grant_pg_cron_access"() to "dashboard_user";

grant all on function "extensions"."grant_pg_graphql_access"() to "postgres" with grant option;

revoke all on function "extensions"."grant_pg_net_access"() from "postgres";
grant all on function "extensions"."grant_pg_net_access"() to "postgres" with grant option;
grant all on function "extensions"."grant_pg_net_access"() to "dashboard_user";

grant all on function "extensions"."pgrst_ddl_watch"() to "postgres" with grant option;

grant all on function "extensions"."pgrst_drop_watch"() to "postgres" with grant option;

grant all on function "extensions"."set_graphql_placeholder"() to "postgres" with grant option;

grant all on function "public"."slugify"("value" "text") to "anon";
grant all on function "public"."slugify"("value" "text") to "authenticated";
grant all on function "public"."slugify"("value" "text") to "service_role";

grant all on table "authentication"."access_token" to "anon";
grant all on table "authentication"."access_token" to "authenticated";
grant all on table "authentication"."access_token" to "service_role";

grant all on sequence "authentication"."access_token_id_seq" to "anon";
grant all on sequence "authentication"."access_token_id_seq" to "authenticated";
grant all on sequence "authentication"."access_token_id_seq" to "service_role";

grant all on table "authentication"."authenticator" to "anon";
grant all on table "authentication"."authenticator" to "authenticated";
grant all on table "authentication"."authenticator" to "service_role";
grant all on table "authentication"."authenticator" to "supabase_admin";

grant all on sequence "authentication"."authenticator_id_seq" to "anon";
grant all on sequence "authentication"."authenticator_id_seq" to "authenticated";
grant all on sequence "authentication"."authenticator_id_seq" to "service_role";
grant all on sequence "authentication"."authenticator_id_seq" to "supabase_admin";

grant all on table "authentication"."authorization_code" to "anon";
grant all on table "authentication"."authorization_code" to "authenticated";
grant all on table "authentication"."authorization_code" to "service_role";

grant all on sequence "authentication"."authorization_code_id_seq" to "anon";
grant all on sequence "authentication"."authorization_code_id_seq" to "authenticated";
grant all on sequence "authentication"."authorization_code_id_seq" to "service_role";

grant all on table "authentication"."authorization_request" to "anon";
grant all on table "authentication"."authorization_request" to "authenticated";
grant all on table "authentication"."authorization_request" to "service_role";

grant all on sequence "authentication"."authorization_request_id_seq" to "anon";
grant all on sequence "authentication"."authorization_request_id_seq" to "authenticated";
grant all on sequence "authentication"."authorization_request_id_seq" to "service_role";

grant all on table "authentication"."challenge" to "anon";
grant all on table "authentication"."challenge" to "authenticated";
grant all on table "authentication"."challenge" to "service_role";
grant all on table "authentication"."challenge" to "supabase_admin";

grant all on sequence "authentication"."challenge_id_seq" to "anon";
grant all on sequence "authentication"."challenge_id_seq" to "authenticated";
grant all on sequence "authentication"."challenge_id_seq" to "service_role";
grant all on sequence "authentication"."challenge_id_seq" to "supabase_admin";

grant all on table "authentication"."client" to "anon";
grant all on table "authentication"."client" to "authenticated";
grant all on table "authentication"."client" to "service_role";

grant all on table "authentication"."client_scope" to "anon";
grant all on table "authentication"."client_scope" to "authenticated";
grant all on table "authentication"."client_scope" to "service_role";

grant all on table "authentication"."device_challenge" to "anon";
grant all on table "authentication"."device_challenge" to "authenticated";
grant all on table "authentication"."device_challenge" to "service_role";

grant all on sequence "authentication"."device_challenge_id_seq" to "anon";
grant all on sequence "authentication"."device_challenge_id_seq" to "authenticated";
grant all on sequence "authentication"."device_challenge_id_seq" to "service_role";

grant all on table "authentication"."passcode" to "anon";
grant all on table "authentication"."passcode" to "authenticated";
grant all on table "authentication"."passcode" to "service_role";

grant all on sequence "authentication"."passcode_id_seq" to "anon";
grant all on sequence "authentication"."passcode_id_seq" to "authenticated";
grant all on sequence "authentication"."passcode_id_seq" to "service_role";

grant all on table "authentication"."refresh_token" to "anon";
grant all on table "authentication"."refresh_token" to "authenticated";
grant all on table "authentication"."refresh_token" to "service_role";

grant all on sequence "authentication"."refresh_token_id_seq" to "anon";
grant all on sequence "authentication"."refresh_token_id_seq" to "authenticated";
grant all on sequence "authentication"."refresh_token_id_seq" to "service_role";

grant all on table "authentication"."scope" to "anon";
grant all on table "authentication"."scope" to "authenticated";
grant all on table "authentication"."scope" to "service_role";

grant all on table "authentication"."user" to "anon";
grant all on table "authentication"."user" to "authenticated";
grant all on table "authentication"."user" to "service_role";

grant all on table "authentication"."user_consent" to "anon";
grant all on table "authentication"."user_consent" to "authenticated";
grant all on table "authentication"."user_consent" to "service_role";

grant all on sequence "authentication"."user_consent_user_id_seq" to "anon";
grant all on sequence "authentication"."user_consent_user_id_seq" to "authenticated";
grant all on sequence "authentication"."user_consent_user_id_seq" to "service_role";

grant all on sequence "authentication"."user_id_seq" to "anon";
grant all on sequence "authentication"."user_id_seq" to "authenticated";
grant all on sequence "authentication"."user_id_seq" to "service_role";

grant all on table "public"."asset" to "anon";
grant all on table "public"."asset" to "authenticated";
grant all on table "public"."asset" to "service_role";

grant all on sequence "public"."asset_id_seq" to "anon";
grant all on sequence "public"."asset_id_seq" to "authenticated";
grant all on sequence "public"."asset_id_seq" to "service_role";

grant all on table "public"."catalog" to "anon";
grant all on table "public"."catalog" to "authenticated";
grant all on table "public"."catalog" to "service_role";

grant all on sequence "public"."catalog_id_seq" to "anon";
grant all on sequence "public"."catalog_id_seq" to "authenticated";
grant all on sequence "public"."catalog_id_seq" to "service_role";

grant all on table "public"."collection" to "anon";
grant all on table "public"."collection" to "authenticated";
grant all on table "public"."collection" to "service_role";

grant all on table "public"."collection_comment" to "anon";
grant all on table "public"."collection_comment" to "authenticated";
grant all on table "public"."collection_comment" to "service_role";

grant all on sequence "public"."collection_comment_collection_id_seq" to "anon";
grant all on sequence "public"."collection_comment_collection_id_seq" to "authenticated";
grant all on sequence "public"."collection_comment_collection_id_seq" to "service_role";

grant all on table "public"."collection_entry" to "anon";
grant all on table "public"."collection_entry" to "authenticated";
grant all on table "public"."collection_entry" to "service_role";

grant all on sequence "public"."collection_id_seq" to "anon";
grant all on sequence "public"."collection_id_seq" to "authenticated";
grant all on sequence "public"."collection_id_seq" to "service_role";

grant all on table "public"."collection_tag" to "anon";
grant all on table "public"."collection_tag" to "authenticated";
grant all on table "public"."collection_tag" to "service_role";

grant all on sequence "public"."collection_tag_collection_id_seq" to "anon";
grant all on sequence "public"."collection_tag_collection_id_seq" to "authenticated";
grant all on sequence "public"."collection_tag_collection_id_seq" to "service_role";

grant all on table "public"."comment" to "anon";
grant all on table "public"."comment" to "authenticated";
grant all on table "public"."comment" to "service_role";

grant all on sequence "public"."comment_id_seq" to "anon";
grant all on sequence "public"."comment_id_seq" to "authenticated";
grant all on sequence "public"."comment_id_seq" to "service_role";

grant all on table "public"."comment_reaction" to "anon";
grant all on table "public"."comment_reaction" to "authenticated";
grant all on table "public"."comment_reaction" to "service_role";

grant all on table "public"."settings_revision" to "anon";
grant all on table "public"."settings_revision" to "authenticated";
grant all on table "public"."settings_revision" to "service_role";

grant all on sequence "public"."config_version_seq" to "anon";
grant all on sequence "public"."config_version_seq" to "authenticated";
grant all on sequence "public"."config_version_seq" to "service_role";

grant all on table "public"."contribution" to "anon";
grant all on table "public"."contribution" to "authenticated";
grant all on table "public"."contribution" to "service_role";

grant all on table "public".image to "anon";
grant all on table "public".image to "authenticated";
grant all on table "public".image to "service_role";

grant all on table "public".image_creator to "anon";
grant all on table "public".image_creator to "authenticated";
grant all on table "public".image_creator to "service_role";

grant all on sequence "public".image_creator_image_id_seq to "anon";
grant all on sequence "public".image_creator_image_id_seq to "authenticated";
grant all on sequence "public".image_creator_image_id_seq to "service_role";

grant all on sequence "public".image_id_seq to "anon";
grant all on sequence "public".image_id_seq to "authenticated";
grant all on sequence "public".image_id_seq to "service_role";

grant all on table "public"."creator" to "anon";
grant all on table "public"."creator" to "authenticated";
grant all on table "public"."creator" to "service_role";

grant all on table "public"."creator_comment" to "anon";
grant all on table "public"."creator_comment" to "authenticated";
grant all on table "public"."creator_comment" to "service_role";

grant all on sequence "public"."creator_comment_creator_id_seq" to "anon";
grant all on sequence "public"."creator_comment_creator_id_seq" to "authenticated";
grant all on sequence "public"."creator_comment_creator_id_seq" to "service_role";

grant all on sequence "public"."creator_id_seq" to "anon";
grant all on sequence "public"."creator_id_seq" to "authenticated";
grant all on sequence "public"."creator_id_seq" to "service_role";

grant all on table "public"."edition" to "anon";
grant all on table "public"."edition" to "authenticated";
grant all on table "public"."edition" to "service_role";

grant all on sequence "public"."edition_id_seq" to "anon";
grant all on sequence "public"."edition_id_seq" to "authenticated";
grant all on sequence "public"."edition_id_seq" to "service_role";

grant all on table "public"."language" to "anon";
grant all on table "public"."language" to "authenticated";
grant all on table "public"."language" to "service_role";

grant all on table "public"."publisher" to "anon";
grant all on table "public"."publisher" to "authenticated";
grant all on table "public"."publisher" to "service_role";

grant all on table "public"."publisher_comment" to "anon";
grant all on table "public"."publisher_comment" to "authenticated";
grant all on table "public"."publisher_comment" to "service_role";

grant all on sequence "public"."publisher_comment_publisher_id_seq" to "anon";
grant all on sequence "public"."publisher_comment_publisher_id_seq" to "authenticated";
grant all on sequence "public"."publisher_comment_publisher_id_seq" to "service_role";

grant all on sequence "public"."publisher_id_seq" to "anon";
grant all on sequence "public"."publisher_id_seq" to "authenticated";
grant all on sequence "public"."publisher_id_seq" to "service_role";

grant all on table "public"."review" to "anon";
grant all on table "public"."review" to "authenticated";
grant all on table "public"."review" to "service_role";

grant all on sequence "public"."review_id_seq" to "anon";
grant all on sequence "public"."review_id_seq" to "authenticated";
grant all on sequence "public"."review_id_seq" to "service_role";

grant all on table "public"."series" to "anon";
grant all on table "public"."series" to "authenticated";
grant all on table "public"."series" to "service_role";

grant all on table "public"."series_comment" to "anon";
grant all on table "public"."series_comment" to "authenticated";
grant all on table "public"."series_comment" to "service_role";

grant all on sequence "public"."series_comment_series_id_seq" to "anon";
grant all on sequence "public"."series_comment_series_id_seq" to "authenticated";
grant all on sequence "public"."series_comment_series_id_seq" to "service_role";

grant all on table "public"."series_entry" to "anon";
grant all on table "public"."series_entry" to "authenticated";
grant all on table "public"."series_entry" to "service_role";

grant all on sequence "public"."series_entry_work_id_seq" to "anon";
grant all on sequence "public"."series_entry_work_id_seq" to "authenticated";
grant all on sequence "public"."series_entry_work_id_seq" to "service_role";

grant all on sequence "public"."series_id_seq" to "anon";
grant all on sequence "public"."series_id_seq" to "authenticated";
grant all on sequence "public"."series_id_seq" to "service_role";

grant all on table "public"."series_tag" to "anon";
grant all on table "public"."series_tag" to "authenticated";
grant all on table "public"."series_tag" to "service_role";

grant all on sequence "public"."series_tag_series_id_seq" to "anon";
grant all on sequence "public"."series_tag_series_id_seq" to "authenticated";
grant all on sequence "public"."series_tag_series_id_seq" to "service_role";

grant all on table "public"."settings" to "anon";
grant all on table "public"."settings" to "authenticated";
grant all on table "public"."settings" to "service_role";

grant all on table "public"."tag" to "anon";
grant all on table "public"."tag" to "authenticated";
grant all on table "public"."tag" to "service_role";

grant all on sequence "public"."tag_id_seq" to "anon";
grant all on sequence "public"."tag_id_seq" to "authenticated";
grant all on sequence "public"."tag_id_seq" to "service_role";

grant all on table "public"."user_collection_favorite" to "anon";
grant all on table "public"."user_collection_favorite" to "authenticated";
grant all on table "public"."user_collection_favorite" to "service_role";

grant all on sequence "public"."user_collection_favorite_user_id_seq" to "anon";
grant all on sequence "public"."user_collection_favorite_user_id_seq" to "authenticated";
grant all on sequence "public"."user_collection_favorite_user_id_seq" to "service_role";

grant all on table "public"."user_creator_favorite" to "anon";
grant all on table "public"."user_creator_favorite" to "authenticated";
grant all on table "public"."user_creator_favorite" to "service_role";

grant all on sequence "public"."user_creator_favorite_user_id_seq" to "anon";
grant all on sequence "public"."user_creator_favorite_user_id_seq" to "authenticated";
grant all on sequence "public"."user_creator_favorite_user_id_seq" to "service_role";

grant all on table "public"."work" to "anon";
grant all on table "public"."work" to "authenticated";
grant all on table "public"."work" to "service_role";

grant all on table "public"."work_comment" to "anon";
grant all on table "public"."work_comment" to "authenticated";
grant all on table "public"."work_comment" to "service_role";

grant all on sequence "public"."work_comment_work_id_seq" to "anon";
grant all on sequence "public"."work_comment_work_id_seq" to "authenticated";
grant all on sequence "public"."work_comment_work_id_seq" to "service_role";

grant all on sequence "public"."work_id_seq" to "anon";
grant all on sequence "public"."work_id_seq" to "authenticated";
grant all on sequence "public"."work_id_seq" to "service_role";

grant all on table "public"."work_rating" to "anon";
grant all on table "public"."work_rating" to "authenticated";
grant all on table "public"."work_rating" to "service_role";

grant all on sequence "public"."work_rating_work_id_seq" to "anon";
grant all on sequence "public"."work_rating_work_id_seq" to "authenticated";
grant all on sequence "public"."work_rating_work_id_seq" to "service_role";

grant all on table "public"."work_tag" to "anon";
grant all on table "public"."work_tag" to "authenticated";
grant all on table "public"."work_tag" to "service_role";

grant all on sequence "public"."work_tag_work_id_seq" to "anon";
grant all on sequence "public"."work_tag_work_id_seq" to "authenticated";
grant all on sequence "public"."work_tag_work_id_seq" to "service_role";

alter default privileges for role "postgres" in schema "authentication" grant all on sequences to "postgres";
alter default privileges for role "postgres" in schema "authentication" grant all on sequences to "anon";
alter default privileges for role "postgres" in schema "authentication" grant all on sequences to "authenticated";
alter default privileges for role "postgres" in schema "authentication" grant all on sequences to "service_role";

alter default privileges for role "postgres" in schema "authentication" grant all on functions to "postgres";
alter default privileges for role "postgres" in schema "authentication" grant all on functions to "anon";
alter default privileges for role "postgres" in schema "authentication" grant all on functions to "authenticated";
alter default privileges for role "postgres" in schema "authentication" grant all on functions to "service_role";

alter default privileges for role "postgres" in schema "authentication" grant all on tables to "postgres";
alter default privileges for role "postgres" in schema "authentication" grant all on tables to "anon";
alter default privileges for role "postgres" in schema "authentication" grant all on tables to "authenticated";
alter default privileges for role "postgres" in schema "authentication" grant all on tables to "service_role";

alter default privileges for role "postgres" in schema "public" grant all on sequences to "postgres";
alter default privileges for role "postgres" in schema "public" grant all on sequences to "anon";
alter default privileges for role "postgres" in schema "public" grant all on sequences to "authenticated";
alter default privileges for role "postgres" in schema "public" grant all on sequences to "service_role";

alter default privileges for role "postgres" in schema "public" grant all on functions to "postgres";
alter default privileges for role "postgres" in schema "public" grant all on functions to "anon";
alter default privileges for role "postgres" in schema "public" grant all on functions to "authenticated";
alter default privileges for role "postgres" in schema "public" grant all on functions to "service_role";

alter default privileges for role "postgres" in schema "public" grant all on tables to "postgres";
alter default privileges for role "postgres" in schema "public" grant all on tables to "anon";
alter default privileges for role "postgres" in schema "public" grant all on tables to "authenticated";
alter default privileges for role "postgres" in schema "public" grant all on tables to "service_role";

reset all;
