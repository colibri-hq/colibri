---
title: HTTP API
description: REST API documentation for Colibri
date: 2024-01-01
order: 1
tags: [api, rest, developers, reference]
relevance: 70
---

# HTTP API

> **Coming Soon**: The public HTTP API is currently under development.
>
> In the meantime, see the [CLI documentation](/cli) for programmatic access.

## Current Status

Colibri currently uses tRPC for its internal API, which provides type-safe communication between the web application and server. We are working on a public REST API that will provide:

- RESTful endpoints for all resources
- OAuth 2.0 authentication
- OpenAPI/Swagger documentation
- Rate limiting and usage quotas

## Planned Endpoints

| Endpoint              | Method           | Description                 |
| --------------------- | ---------------- | --------------------------- |
| `/api/v1/works`       | GET, POST        | List and create works       |
| `/api/v1/works/:id`   | GET, PUT, DELETE | Work CRUD operations        |
| `/api/v1/creators`    | GET, POST        | List and create creators    |
| `/api/v1/collections` | GET, POST        | List and create collections |
| `/api/v1/search`      | GET              | Search across all resources |
| `/api/v1/upload`      | POST             | Upload ebook files          |

## Authentication

The API will support:

- OAuth 2.0 Bearer tokens
- API keys for server-to-server communication

## Rate Limiting

- Standard: 100 requests per minute
- Authenticated: 1000 requests per minute
- Uploads: 10 per minute

## Contributing

Interested in helping build the public API? Check out our [GitHub repository](https://github.com/colibri-hq/colibri) and join the discussion in Issues.
