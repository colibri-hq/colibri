INSERT INTO public.catalog (feed_url, title, description, image_url, url, updated_by, updated_at, created_at,
                            age_requirement, active, color, credentials_required)
VALUES ('https://arxiv.maplepop.com/catalog/', 'arXiv',
        'Archive over 1 million latest PDF e-prints in science subjects',
        'http://t2.gstatic.com/images?q=tbn:ANd9GcTlxXmGmWWSp8FQ5mBLJQFbtgDsqKy1S3Psn85IIkt5gbyNCEFhEQ',
        'http://arxiv.org/', null, NULL, '2024-05-06 11:54:34.128748+00', 0, true, NULL, false),
       ('https://standardebooks.org/feeds/opds', 'Standard Ebooks',
        'Free and liberated ebooks, carefully produced for the true book lover.',
        'https://standardebooks.org/images/logo-small.svg', 'https://standardebooks.org/', null, NULL,
        '2024-05-07 09:31:22.346935+00', 0, false, '(57,68,81)', true),
       ('https://theanarchistlibrary.org/opds', 'The Anarchist Library', NULL, NULL, NULL, NULL, NULL,
        '2024-05-12 08:25:47.4048+00', 0, true, NULL, false);
