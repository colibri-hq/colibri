
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```bash
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const ANON_KEY: string;
	export const API_URL: string;
	export const DB_URL: string;
	export const GRAPHQL_URL: string;
	export const INBUCKET_URL: string;
	export const JWT_SECRET: string;
	export const S3_PROTOCOL_ACCESS_KEY_ID: string;
	export const S3_PROTOCOL_ACCESS_KEY_SECRET: string;
	export const S3_PROTOCOL_REGION: string;
	export const SERVICE_ROLE_KEY: string;
	export const STORAGE_S3_URL: string;
	export const STUDIO_URL: string;
	export const DATABASE_CERTIFICATE: string;
	export const S3_BUCKET_COVERS: string;
	export const S3_BUCKET_ASSETS: string;
	export const APP_SECRET_KEY: string;
	export const MAILJET_API_KEY: string;
	export const MAILJET_SECRET_KEY: string;
	export const SESSION_ID_COOKIE_NAME: string;
	export const AUTH_TOKEN_COOKIE_NAME: string;
	export const OAUTH_ISSUER: string;
	export const OAUTH_AUTHORIZATION_CODE_TTL: string;
	export const OAUTH_AUTHORIZATION_REQUEST_TTL: string;
	export const OAUTH_ACCESS_TOKEN_TTL: string;
	export const OAUTH_REFRESH_TOKEN_TTL: string;
	export const OAUTH_DEVICE_POLLING_INTERVAL: string;
	export const OAUTH_DEVICE_CODE_TTL: string;
	export const OAUTH_CONSENT_TTL: string;
	export const LLMS_TXT_ENABLED: string;
	export const COMMAND_MODE: string;
	export const LC_ADDRESS: string;
	export const LC_TIME: string;
	export const PYENV_ROOT: string;
	export const XDG_DATA_DIRS: string;
	export const SHELL: string;
	export const __CFBundleIdentifier: string;
	export const TMPDIR: string;
	export const LC_ALL: string;
	export const DEBUG_COLORS: string;
	export const NIX_PROFILES: string;
	export const COLORTERM: string;
	export const TOOLBOX_VERSION: string;
	export const HOME: string;
	export const FORCE_COLOR: string;
	export const nvm_default_version: string;
	export const PATH: string;
	export const LOGNAME: string;
	export const BUN_INSTALL: string;
	export const XPC_FLAGS: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const LC_NAME: string;
	export const LC_NUMERIC: string;
	export const MOCHA_COLORS: string;
	export const DENO_INSTALL: string;
	export const GPG_TTY: string;
	export const LC_MEASUREMENT: string;
	export const LC_CTYPE: string;
	export const NIX_SSL_CERT_FILE: string;
	export const npm_config_color: string;
	export const SSH_AUTH_SOCK: string;
	export const XPC_SERVICE_NAME: string;
	export const USER: string;
	export const fish_greeting: string;
	export const LC_MONETARY: string;
	export const PWD: string;
	export const LC_TELEPHONE: string;
	export const NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	export const PUBLIC_HELP_CENTER_BASE_URL: string;
	export const PUBLIC_PASSCODE_LENGTH: string;
	export const PUBLIC_PASSCODE_TTL: string;
	export const PUBLIC_GUTENDEX_INSTANCE_URL: string;
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		ANON_KEY: string;
		API_URL: string;
		DB_URL: string;
		GRAPHQL_URL: string;
		INBUCKET_URL: string;
		JWT_SECRET: string;
		S3_PROTOCOL_ACCESS_KEY_ID: string;
		S3_PROTOCOL_ACCESS_KEY_SECRET: string;
		S3_PROTOCOL_REGION: string;
		SERVICE_ROLE_KEY: string;
		STORAGE_S3_URL: string;
		STUDIO_URL: string;
		DATABASE_CERTIFICATE: string;
		S3_BUCKET_COVERS: string;
		S3_BUCKET_ASSETS: string;
		APP_SECRET_KEY: string;
		MAILJET_API_KEY: string;
		MAILJET_SECRET_KEY: string;
		SESSION_ID_COOKIE_NAME: string;
		AUTH_TOKEN_COOKIE_NAME: string;
		OAUTH_ISSUER: string;
		OAUTH_AUTHORIZATION_CODE_TTL: string;
		OAUTH_AUTHORIZATION_REQUEST_TTL: string;
		OAUTH_ACCESS_TOKEN_TTL: string;
		OAUTH_REFRESH_TOKEN_TTL: string;
		OAUTH_DEVICE_POLLING_INTERVAL: string;
		OAUTH_DEVICE_CODE_TTL: string;
		OAUTH_CONSENT_TTL: string;
		LLMS_TXT_ENABLED: string;
		COMMAND_MODE: string;
		LC_ADDRESS: string;
		LC_TIME: string;
		PYENV_ROOT: string;
		XDG_DATA_DIRS: string;
		SHELL: string;
		__CFBundleIdentifier: string;
		TMPDIR: string;
		LC_ALL: string;
		DEBUG_COLORS: string;
		NIX_PROFILES: string;
		COLORTERM: string;
		TOOLBOX_VERSION: string;
		HOME: string;
		FORCE_COLOR: string;
		nvm_default_version: string;
		PATH: string;
		LOGNAME: string;
		BUN_INSTALL: string;
		XPC_FLAGS: string;
		__CF_USER_TEXT_ENCODING: string;
		LC_NAME: string;
		LC_NUMERIC: string;
		MOCHA_COLORS: string;
		DENO_INSTALL: string;
		GPG_TTY: string;
		LC_MEASUREMENT: string;
		LC_CTYPE: string;
		NIX_SSL_CERT_FILE: string;
		npm_config_color: string;
		SSH_AUTH_SOCK: string;
		XPC_SERVICE_NAME: string;
		USER: string;
		fish_greeting: string;
		LC_MONETARY: string;
		PWD: string;
		LC_TELEPHONE: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		PUBLIC_HELP_CENTER_BASE_URL: string;
		PUBLIC_PASSCODE_LENGTH: string;
		PUBLIC_PASSCODE_TTL: string;
		PUBLIC_GUTENDEX_INSTANCE_URL: string;
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
