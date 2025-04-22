INSERT INTO authentication.client (id, redirect_uris, secret, name, description, user_id, created_at, updated_at,
                                   personal, revoked, active)
VALUES ('calibre-plugin', '{http://localhost:9711}', NULL, 'Colibri Calibre Plugin',
        'The Calibre Plugin for Colibri provides a first-party integration between Calibre and Colibri, allowing to synchronize books from Calibre to a Colibri instance.',
        NULL, '2024-06-04 22:00:08.757992+00', NULL, false, false, true);

INSERT INTO authentication.scope (id, description, created_at, server)
VALUES ('profile', 'Retrieve a user''s profile', '2024-06-05 12:54:18.317974+00', false),
       ('ingest', 'Upload books from another application in bulk.', '2024-06-05 12:54:18.317974+00', false),
       ('offline_access', 'Maintain access to your account even when you are not actively using the app.',
        '2024-06-19 19:47:01.9216+00', false),
       ('openid', 'Verify your identity.', '2024-06-19 19:47:01.9216+00', false),
       ('email', 'Grants access to your email address and its verification status.', '2024-06-19 19:47:01.9216+00',
        false);

INSERT INTO authentication.client_scope (client_id, scope_id)
VALUES ('calibre-plugin', 'profile'),
       ('calibre-plugin', 'ingest');
