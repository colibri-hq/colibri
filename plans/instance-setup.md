> **GitHub Issue:** [#138](https://github.com/colibri-hq/colibri/issues/138)

# Instance Setup

## Description

Currently, setting up a Colibri instance involves manual configuration of initial settings (e.g. Storage DSN, SMTP
server) and the first user account. While this is possible via CLI commands already, a more user-friendly guided setup
process would greatly enhance the onboarding experience for new instances.

Ideally, this would be a web-based setup wizard that walks the administrator through the necessary steps to get their
instance up and running, and a CLI-based alternative for headless setups.

Ideally, the setup process would be available on first launch if no configuration is detected, or via a dedicated setup command.

## Current Implementation Status

**Not Implemented:**

- ❌ No setup wizard UI
- ❌ No CLI setup command
- ❌ Manual initial configuration required

## Implementation Plan

## Open Questions

- What additional configuration options should be included in the initial setup process? -> Storage DSN, SMTP server, instance name.
- Will the wizard be used for version upgrades or only for initial setup?
