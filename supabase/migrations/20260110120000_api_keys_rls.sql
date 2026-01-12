-- Fix API key security: Remove overly permissive grants and add RLS policies

-- Revoke anonymous access to API keys (should never be accessible without auth)
REVOKE ALL ON TABLE authentication.api_key FROM anon;
REVOKE ALL ON SEQUENCE authentication.api_key_id_seq FROM anon;

-- Add RLS policies for api_key table
-- Note: These policies use the app.current_user_id setting which should be
-- set by the application before queries. The service_role bypasses RLS.

CREATE POLICY "Users can view their own API keys"
  ON authentication.api_key FOR SELECT
  USING (
    user_id::text = current_setting('app.current_user_id', true)
  );

CREATE POLICY "Users can insert their own API keys"
  ON authentication.api_key FOR INSERT
  WITH CHECK (
    user_id::text = current_setting('app.current_user_id', true)
  );

CREATE POLICY "Users can update their own API keys"
  ON authentication.api_key FOR UPDATE
  USING (
    user_id::text = current_setting('app.current_user_id', true)
  );

CREATE POLICY "Users can delete their own API keys"
  ON authentication.api_key FOR DELETE
  USING (
    user_id::text = current_setting('app.current_user_id', true)
  );

-- Also add a policy for service role to allow the validateApiKey function to work
-- (service_role already bypasses RLS, but this is for documentation)
COMMENT ON TABLE authentication.api_key IS 'API keys for programmatic access via Basic Auth. RLS enabled - users can only access their own keys.';
