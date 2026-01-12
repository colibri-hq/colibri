-- Migration: Rename API key scopes to new naming convention
-- Old format: action:resource (e.g., read:library)
-- New format: resource:action (e.g., library:read)
--
-- This allows better grouping by resource type in the UI.

-- Rename library scopes
UPDATE authentication.api_key
SET scopes = array_replace(scopes, 'read:library', 'library:read')
WHERE 'read:library' = ANY(scopes);

UPDATE authentication.api_key
SET scopes = array_replace(scopes, 'write:library', 'library:write')
WHERE 'write:library' = ANY(scopes);

-- Rename progress scopes
UPDATE authentication.api_key
SET scopes = array_replace(scopes, 'read:progress', 'progress:read')
WHERE 'read:progress' = ANY(scopes);

UPDATE authentication.api_key
SET scopes = array_replace(scopes, 'write:progress', 'progress:write')
WHERE 'write:progress' = ANY(scopes);

-- Rename download scope to include resource prefix
UPDATE authentication.api_key
SET scopes = array_replace(scopes, 'download', 'library:download')
WHERE 'download' = ANY(scopes);

-- Note: 'admin' scope keeps the same name
