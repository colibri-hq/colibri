# @colibri-hq/setup

Interactive setup wizard for new [Colibri](https://github.com/colibri-hq/colibri) ebook library instances.

This package provides an installer for configuring a new Colibri instance, optionally via a web-based interface.

## Usage

### CLI Mode (default)

Run the interactive command-line wizard:

```bash
npx @colibri-hq/setup
```

The wizard will guide you through:

1. **Database Connection**: Enter your PostgreSQL connection string
2. **Admin Account**: Create the first administrator user
3. **Instance Settings**: Configure your instance name and description
4. **Storage Configuration**: Set up S3-compatible object storage
5. **SMTP Configuration** (optional): Configure email notifications

### Web GUI Mode

Launch the web-based setup wizard:

```bash
npx @colibri-hq/setup --gui
```

Or with a custom port:

```bash
npx @colibri-hq/setup --gui --port 8080
```

The GUI provides a step-by-step visual interface with the same configuration options as the CLI.

## Prerequisites

Before running the setup wizard, ensure you have a working PostgreSQL database server. The easiest way to get started is
by using [Supabase](https://supabase.com/) locally:

1. **PostgreSQL database** with the Colibri schema applied

   ```bash
   # Start the local Supabase database
   pnpx supabase start

   # Or apply migrations to an existing database
   pnpx supabase db push
   ```

2. **S3-compatible storage** configured (one of):
   - AWS S3 bucket
   - MinIO instance
   - Cloudflare R2 bucket
   - Any S3-compatible storage provider

3. **Node.js 24+** installed

## Installation

### Using npx (recommended)

Use npx to run the setup wizard without installing globally:

```bash
npx @colibri-hq/setup
```

### From the monorepo

Alternatively, if you're working on the Colibri monorepo, you can build and run the package directly:

```bash
# From the repository root
pnpm install

# Run the setup wizard
cd packages/setup
pnpm build
node bin/run.js
```

## CLI Reference

```
USAGE
  $ colibri-setup [--gui] [--port <number>]

FLAGS
  --gui         Launch web-based setup wizard instead of CLI
  --port=<num>  [default: 3333] Port for web GUI server

EXAMPLES
  $ colibri-setup
  $ colibri-setup --gui
  $ colibri-setup --gui --port 8080
```

## Configuration Options

### Database

| Field             | Description    | Example                                       |
| ----------------- | -------------- | --------------------------------------------- |
| Connection String | PostgreSQL DSN | `postgres://user:pass@localhost:5432/colibri` |

The database must have the Colibri schema already applied. The wizard will test the connection and verify the schema
exists before proceeding.

### Admin Account

| Field        | Description                | Required |
| ------------ | -------------------------- | -------- |
| Email        | Admin user's email address | Yes      |
| Display Name | Name shown in the UI       | Yes      |

The admin account is created with full privileges and is pre-verified (no email confirmation needed).

### Instance Settings

| Field         | Description              | Default   |
| ------------- | ------------------------ | --------- |
| Instance Name | Name shown in the header | `Colibri` |
| Description   | Optional tagline         | -         |

### Storage (S3-compatible)

| Field             | Description                | Required            |
| ----------------- | -------------------------- | ------------------- |
| Endpoint          | S3 API endpoint URL        | Yes                 |
| Access Key ID     | S3 access key              | Yes                 |
| Secret Access Key | S3 secret key              | Yes                 |
| Region            | AWS region (if applicable) | No                  |
| Force Path Style  | Use path-style URLs        | Yes (default: true) |

**Common endpoint examples:**

- AWS S3: `https://s3.amazonaws.com` or `https://s3.us-west-2.amazonaws.com`
- MinIO: `http://localhost:9000`
- Cloudflare R2: `https://<account-id>.r2.cloudflarestorage.com`

**Path-style URLs:** Enable for MinIO and most self-hosted S3-compatible storage. Disable for AWS S3.

### SMTP (Optional)

| Field        | Description                  | Default |
| ------------ | ---------------------------- | ------- |
| Host         | SMTP server hostname         | -       |
| Port         | SMTP server port             | `587`   |
| Username     | SMTP authentication username | -       |
| Password     | SMTP authentication password | -       |
| From Address | Sender email address         | -       |

SMTP configuration is optional. You can skip this step and configure it later through the Colibri settings.

## Complete Setup Workflow

Here's the full workflow to get a working Colibri instance:

```bash
# 1. Clone the repository
git clone https://github.com/colibri-hq/colibri.git
cd colibri

# 2. Install dependencies
pnpm install

# 3. Start the local database
pnpx supabase start

# 4. Set up environment variables
cp .env.example .env
pnpx supabase status --output env >> .env

# 5. Run the setup wizard
npx @colibri-hq/setup

# 6. Start the application
pnpm dev:app
```

After completing these steps, open `http://localhost:5173` in your browser to access Colibri.

## Package Development

This section provides information for developers working on the `@colibri-hq/setup` package. You don't need to read this
to install Colibri.

### Project Structure

```
packages/setup/
├── bin/
│   ├── run.js              # Production CLI entry point
│   └── dev.js              # Development CLI entry point
├── src/
│   ├── commands/
│   │   └── index.ts        # Main CLI command (oclif)
│   ├── core/
│   │   ├── state.ts        # Setup configuration types and helpers
│   │   └── validation.ts   # Input validation (zod)
│   ├── lib/
│   │   └── server.ts       # SvelteKit dev server launcher
│   ├── routes/             # SvelteKit routes for GUI
│   │   ├── +layout.svelte
│   │   ├── +page.svelte    # Main wizard UI
│   │   └── api/            # API endpoints
│   │       ├── test-database/+server.ts
│   │       └── apply-config/+server.ts
│   └── __tests__/          # E2E tests
│       ├── setup.e2e.test.ts
│       ├── api.e2e.test.ts
│       └── test-utils.ts   # Test utilities with Testcontainers
├── svelte.config.js
├── vite.config.ts
└── vitest.config.ts
```

### Scripts

```bash
# Build the package
pnpm build

# Run in development mode (TypeScript watch)
pnpm dev

# Type check
pnpm check

# Lint
pnpm lint

# Format
pnpm fmt

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Testing

The package includes E2E tests that use [Testcontainers](https://testcontainers.com/) to spin up a real PostgreSQL
database:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

**Requirements for running tests:**

- Docker must be running (for Testcontainers)
- Tests may take ~10 seconds on first run (container startup)

### Building

```bash
# Build TypeScript and generate oclif manifest
pnpm build

# Run the built CLI
node bin/run.js --help
```

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/colibri-hq/colibri) for contribution
guidelines.

### Development Tips

1. **Testing changes to the CLI:**

   ```bash
   pnpm build
   node bin/run.js
   ```

2. **Testing the GUI:**

   ```bash
   pnpm build
   node bin/run.js --gui
   ```

3. **Running the dev server for GUI development:**

   ```bash
   cd packages/setup
   pnpm exec vite dev
   ```

4. **Adding new configuration options:**
   - Update `src/core/state.ts` with the new fields
   - Add validation in `src/core/validation.ts`
   - Update CLI prompts in `src/commands/index.ts`
   - Update GUI form in `src/routes/+page.svelte`
   - Update API in `src/routes/api/apply-config/+server.ts`
   - Add tests in `src/__tests__/`

## Troubleshooting

### "The database schema is not initialized"

The Colibri schema must be applied before running setup:

```bash
pnpx supabase db push
```

### "Connection refused" errors

Ensure your PostgreSQL server is running and accessible:

```bash
# For local Supabase
pnpx supabase start

# Check status
pnpx supabase status
```

### GUI doesn't open automatically

If the browser doesn't open automatically, manually navigate to `http://localhost:3333` (or your custom port).

### Storage connection issues

- **MinIO/local S3:** Ensure "Force path-style URLs" is enabled
- **AWS S3:** Disable "Force path-style URLs" and provide the correct region
- **Check credentials:** Verify your access key and secret key are correct

## License

[AGPL-3.0-or-later](../../LICENSE) - See the main repository for full license text and the reasoning behind this choice.

## Related Packages

- [@colibri-hq/sdk](../sdk) - Core SDK with database and storage operations
- [@colibri-hq/ui](../ui) - Shared UI component library
- [apps/app](../../apps/app) - Main Colibri web application
- [apps/cli](../../apps/cli) - Colibri CLI for library management
