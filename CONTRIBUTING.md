Contribution Guidelines
=======================
We welcome contributions to Colibri! This document describes how to get started locally, and what the process looks like
for contributing to the project.

Getting Started
----------------
To get started with Colibri, clone the repository and install the dependencies:

```bash
git clone https://github.com/colibri-hq/colibri.git
cd colibri

# Enable pnpm if you haven't already
corepack enable pnpm

pnpm install
```

Initialize the Postgres database using supabase (for now):

```bash
pnpx supabase start
```

This will start a local Supabase instance with a Postgres database.  
You can access the Supabase dashboard at `http://localhost:54323`.

Prepare the configuration file:

```bash
cp .env.example .env

# Update the .env file with your Supabase credentials
pnpx supabase status --output env >> .env
```

To run the development server, use the following command:

```bash
pnpm run dev
```

### Using Docker (not fully stable yet)
If you prefer to use Docker, you can run the following command to start the Colibri stack:

```bash
docker-compose up
```

