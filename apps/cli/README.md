# @colibri-hq/cli

The command-line interface for Colibri, an ebook management app

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@colibri-hq/cli.svg)](https://npmjs.org/package/@colibri-hq/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@colibri-hq/cli.svg)](https://npmjs.org/package/@colibri-hq/cli)

<!-- toc -->

- [@colibri-hq/cli](#colibri-hqcli)
- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @colibri-hq/cli
$ colibri COMMAND
running command...
$ colibri (--version)
@colibri-hq/cli/0.0.1 darwin-arm64 node-v23.10.0
$ colibri --help [COMMAND]
USAGE
  $ colibri COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`colibri connect DSN`](#colibri-connect-dsn)
- [`colibri help [COMMAND]`](#colibri-help-command)
- [`colibri login`](#colibri-login)
- [`colibri oauth`](#colibri-oauth)
- [`colibri oauth clients`](#colibri-oauth-clients)
- [`colibri oauth clients add ID`](#colibri-oauth-clients-add-id)
- [`colibri oauth clients remove ID`](#colibri-oauth-clients-remove-id)
- [`colibri oauth clients update ID`](#colibri-oauth-clients-update-id)
- [`colibri plugins`](#colibri-plugins)
- [`colibri plugins add PLUGIN`](#colibri-plugins-add-plugin)
- [`colibri plugins:inspect PLUGIN...`](#colibri-pluginsinspect-plugin)
- [`colibri plugins install PLUGIN`](#colibri-plugins-install-plugin)
- [`colibri plugins link PATH`](#colibri-plugins-link-path)
- [`colibri plugins remove [PLUGIN]`](#colibri-plugins-remove-plugin)
- [`colibri plugins reset`](#colibri-plugins-reset)
- [`colibri plugins uninstall [PLUGIN]`](#colibri-plugins-uninstall-plugin)
- [`colibri plugins unlink [PLUGIN]`](#colibri-plugins-unlink-plugin)
- [`colibri plugins update`](#colibri-plugins-update)
- [`colibri settings`](#colibri-settings)
- [`colibri settings get`](#colibri-settings-get)
- [`colibri settings set KEY VALUE`](#colibri-settings-set-key-value)
- [`colibri settings version`](#colibri-settings-version)
- [`colibri storage config`](#colibri-storage-config)
- [`colibri storage config get`](#colibri-storage-config-get)
- [`colibri storage config set`](#colibri-storage-config-set)
- [`colibri storage copy SOURCE DESTINATION`](#colibri-storage-copy-source-destination)
- [`colibri storage cp SOURCE DESTINATION`](#colibri-storage-cp-source-destination)
- [`colibri storage list [BUCKET]`](#colibri-storage-list-bucket)
- [`colibri storage ls [BUCKET]`](#colibri-storage-ls-bucket)
- [`colibri storage make-bucket BUCKET`](#colibri-storage-make-bucket-bucket)
- [`colibri storage mb BUCKET`](#colibri-storage-mb-bucket)
- [`colibri storage move BUCKET DESTINATION SOURCE`](#colibri-storage-move-bucket-destination-source)
- [`colibri storage mv BUCKET DESTINATION SOURCE`](#colibri-storage-mv-bucket-destination-source)
- [`colibri storage rb BUCKET`](#colibri-storage-rb-bucket)
- [`colibri storage remove KEYS`](#colibri-storage-remove-keys)
- [`colibri storage remove-bucket BUCKET`](#colibri-storage-remove-bucket-bucket)
- [`colibri storage rm KEYS`](#colibri-storage-rm-keys)
- [`colibri users`](#colibri-users)
- [`colibri users add EMAIL`](#colibri-users-add-email)
- [`colibri users remove USER`](#colibri-users-remove-user)
- [`colibri users update USER`](#colibri-users-update-user)

## `colibri connect DSN`

Connect to a Colibri Postgres database.

```
USAGE
  $ colibri connect DSN [--json] [-c <value>] [-i <value>] [-v]

ARGUMENTS
  DSN  The database DSN to connect to

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Connect to a Colibri Postgres database.

EXAMPLES
  $ colibri connect postgres://user:pass@host:port/db

  To connect to a specific Colibri instance, use the --instance option:

    $ colibri connect postgres://user:pass@host:port/db --instance https://colibri.example.com
```

_See code: [src/commands/connect.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/connect.ts)_

## `colibri help [COMMAND]`

Display help for colibri.

```
USAGE
  $ colibri help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for colibri.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.28/src/commands/help.ts)_

## `colibri login`

Login to your Colibri instance.

```
USAGE
  $ colibri login [--json] [-c <value>] [-i <value>] [-v]

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Login to your Colibri instance.

EXAMPLES
  $ colibri login

  To connect to a specific Colibri instance, use the --instance option:

    $ colibri login --instance https://colibri.example.com
```

_See code: [src/commands/login.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/login.ts)_

## `colibri oauth`

Show information about the OAuth server

```
USAGE
  $ colibri oauth [--json] [-c <value>] [-i <value>] [-v]

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Show information about the OAuth server
```

_See code: [src/commands/oauth/index.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/oauth/index.ts)_

## `colibri oauth clients`

List all OAuth clients.

```
USAGE
  $ colibri oauth clients [--json] [-c <value>] [-i <value>] [-v] [-f <value>...] [-p <value>] [-P <value>]

FLAGS
  -P, --per-page=<value>   [default: ∞] Number of items per page.
  -f, --filter=<value>...  Filter clients by a specific attribute.
  -p, --page=<value>       [default: 1] Page number to fetch.

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  List all OAuth clients.

EXAMPLES
  $ colibri oauth clients

  $ colibri oauth clients --instance https://colibri.example.com
```

_See code: [src/commands/oauth/clients/index.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/oauth/clients/index.ts)_

## `colibri oauth clients add ID`

Add a new OAuth client.

```
USAGE
  $ colibri oauth clients add ID [--json] [-c <value>] [-i <value>] [-v] [--description <value>] [--name <value>]
    [--personal] [--redirect-uris <value>] [--scopes <value>] [--secret <value>]

ARGUMENTS
  ID  Client ID (must be alphanumeric)

FLAGS
  --description=<value>    Description of the OAuth client.
  --name=<value>           Name of the OAuth client.
  --personal               Whether this client is personal (only available to its owner).
  --redirect-uris=<value>  Comma-separated list of redirect URIs for this client.
  --scopes=<value>         Comma-separated list of scopes for this client.
  --secret=<value>         Client secret (for server-side clients).

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Add a new OAuth client.

EXAMPLES
  Add a new OAuth client with name and description:

    $ colibri oauth clients add myapp --name "My Application" --description "My awesome application"

  Add a personal OAuth client with redirect URIs:

    $ colibri oauth clients add myapp --personal --redirect-uris "https://example.com/callback"

  Add an OAuth client with specific scopes:

    $ colibri oauth clients add myapp --instance https://colibri.example.com --scopes "read:books" "write:books"
```

_See code: [src/commands/oauth/clients/add.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/oauth/clients/add.ts)_

## `colibri oauth clients remove ID`

Remove an OAuth client.

```
USAGE
  $ colibri oauth clients remove ID [--json] [-c <value>] [-i <value>] [-v] [-f]

ARGUMENTS
  ID  Client ID to remove

FLAGS
  -f, --force  Force the removal without confirmation.

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Remove an OAuth client.

EXAMPLES
  Remove an OAuth client:

    $ colibri oauth clients remove myapp

  Force remove an OAuth client without confirmation:

    $ colibri oauth clients remove myapp --force

  Remove an OAuth client from a specific Colibri instance:

    $ colibri oauth clients remove myapp --instance https://colibri.example.com
```

_See code: [src/commands/oauth/clients/remove.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/oauth/clients/remove.ts)_

## `colibri oauth clients update ID`

Update an OAuth client.

```
USAGE
  $ colibri oauth clients update ID [--json] [-c <value>] [-i <value>] [-v] [--active] [--description <value>] [--name
    <value>] [--personal] [--redirect-uris <value>] [--revoked] [--secret <value>]

ARGUMENTS
  ID  Client ID to update

FLAGS
  --active                 Whether the client is active.
  --description=<value>    Description of the OAuth client.
  --name=<value>           Name of the OAuth client.
  --personal               Whether this client is personal (only available to its owner).
  --redirect-uris=<value>  Comma-separated list of redirect URIs for this client.
  --revoked                Whether the client is revoked.
  --secret=<value>         Client secret (for server-side clients).

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Update an OAuth client.

EXAMPLES
  Update an OAuth client name:

    $ colibri oauth clients update myapp --name "Updated App Name"

  Deactivate an OAuth client:

    $ colibri oauth clients update myapp --active false

  Update redirect URIs for an OAuth client:

    $ colibri oauth clients update myapp --instance https://colibri.example.com --redirect-uris \
      "https://new-example.com/callback"
```

_See code: [src/commands/oauth/clients/update.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/oauth/clients/update.ts)_

## `colibri plugins`

List installed plugins.

```
USAGE
  $ colibri plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ colibri plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/index.ts)_

## `colibri plugins add PLUGIN`

Installs a plugin into colibri.

```
USAGE
  $ colibri plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into colibri.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the COLIBRI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the COLIBRI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ colibri plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ colibri plugins add myplugin

  Install a plugin from a github url.

    $ colibri plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ colibri plugins add someuser/someplugin
```

## `colibri plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ colibri plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ colibri plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/inspect.ts)_

## `colibri plugins install PLUGIN`

Installs a plugin into colibri.

```
USAGE
  $ colibri plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into colibri.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the COLIBRI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the COLIBRI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ colibri plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ colibri plugins install myplugin

  Install a plugin from a github url.

    $ colibri plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ colibri plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/install.ts)_

## `colibri plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ colibri plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ colibri plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/link.ts)_

## `colibri plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ colibri plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ colibri plugins unlink
  $ colibri plugins remove

EXAMPLES
  $ colibri plugins remove myplugin
```

## `colibri plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ colibri plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/reset.ts)_

## `colibri plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ colibri plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ colibri plugins unlink
  $ colibri plugins remove

EXAMPLES
  $ colibri plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/uninstall.ts)_

## `colibri plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ colibri plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ colibri plugins unlink
  $ colibri plugins remove

EXAMPLES
  $ colibri plugins unlink myplugin
```

## `colibri plugins update`

Update installed plugins.

```
USAGE
  $ colibri plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.38/src/commands/plugins/update.ts)_

## `colibri settings`

Get the global instance settings.

```
USAGE
  $ colibri settings [--json] [-c <value>] [-i <value>] [-v]

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Get the global instance settings.

ALIASES
  $ colibri settings
```

## `colibri settings get`

Get the global instance settings.

```
USAGE
  $ colibri settings get [--json] [-c <value>] [-i <value>] [-v]

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Get the global instance settings.

ALIASES
  $ colibri settings
```

_See code: [src/commands/settings/get.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/settings/get.ts)_

## `colibri settings set KEY VALUE`

Set the global instance settings.

```
USAGE
  $ colibri settings set KEY VALUE [--json] [-c <value>] [-i <value>] [-v]

ARGUMENTS
  KEY    The settings key to set.
  VALUE  The value of the setting to set.

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Set the global instance settings.

EXAMPLES
  $ colibri settings set ui.colorMode dark
```

_See code: [src/commands/settings/set.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/settings/set.ts)_

## `colibri settings version`

Show settings version information.

```
USAGE
  $ colibri settings version [--json] [-c <value>] [-i <value>] [-v]

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Show settings version information.
```

_See code: [src/commands/settings/version.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/settings/version.ts)_

## `colibri storage config`

Get the current storage configuration.

```
USAGE
  $ colibri storage config [-c <value>] [-i <value>] [-v] [-E | --json]

FLAGS
  -E, --env  Output the configuration in a format suitable for .env files.

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Get the current storage configuration.

ALIASES
  $ colibri storage config
```

## `colibri storage config get`

Get the current storage configuration.

```
USAGE
  $ colibri storage config get [-c <value>] [-i <value>] [-v] [-E | --json]

FLAGS
  -E, --env  Output the configuration in a format suitable for .env files.

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Get the current storage configuration.

ALIASES
  $ colibri storage config
```

_See code: [src/commands/storage/config/get.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/storage/config/get.ts)_

## `colibri storage config set`

Connect to a storage provider.

```
USAGE
  $ colibri storage config set -e <value> [--json] [-c <value>] [-i <value>] [-v] [-u <value>] [-P] [-r <value>] [-p
    <value>]

FLAGS
  -P, --[no-]force-path-style      Force path style URLs.
  -e, --endpoint=<value>           (required) The storage endpoint URL.
  -p, --secret-access-key=<value>  The secret access key for the storage.
  -r, --region=<value>             [default: eu-west-1] The region of the storage endpoint.
  -u, --access-key-id=<value>      The access key ID for the storage.

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Connect to a storage provider.
```

_See code: [src/commands/storage/config/set.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/storage/config/set.ts)_

## `colibri storage copy SOURCE DESTINATION`

Copy an object in storage.

```
USAGE
  $ colibri storage copy SOURCE... DESTINATION... [--json] [-c <value>] [-i <value>] [-v]

ARGUMENTS
  SOURCE...       Source path to copy
  DESTINATION...  Destination path to copy to

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Copy an object in storage.

ALIASES
  $ colibri storage cp

EXAMPLES
  Copy 'foo' to 'bar'

    $ colibri storage copy assets/foo assets/bar
```

_See code: [src/commands/storage/copy.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/storage/copy.ts)_

## `colibri storage cp SOURCE DESTINATION`

Copy an object in storage.

```
USAGE
  $ colibri storage cp SOURCE... DESTINATION... [--json] [-c <value>] [-i <value>] [-v]

ARGUMENTS
  SOURCE...       Source path to copy
  DESTINATION...  Destination path to copy to

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Copy an object in storage.

ALIASES
  $ colibri storage cp

EXAMPLES
  Copy 'foo' to 'bar'

    $ colibri storage cp assets/foo assets/bar
```

## `colibri storage list [BUCKET]`

List buckets, or objects in a storage bucket.

```
USAGE
  $ colibri storage list [BUCKET] [--json] [-c <value>] [-i <value>] [-v]

ARGUMENTS
  BUCKET  Name of the bucket to list

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  List buckets, or objects in a storage bucket.

ALIASES
  $ colibri storage ls

EXAMPLES
  List all available storage buckets

    $ colibri storage list

  List all files in the 'assets' bucket

    $ colibri storage list assets
```

_See code: [src/commands/storage/list.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/storage/list.ts)_

## `colibri storage ls [BUCKET]`

List buckets, or objects in a storage bucket.

```
USAGE
  $ colibri storage ls [BUCKET] [--json] [-c <value>] [-i <value>] [-v]

ARGUMENTS
  BUCKET  Name of the bucket to list

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  List buckets, or objects in a storage bucket.

ALIASES
  $ colibri storage ls

EXAMPLES
  List all available storage buckets

    $ colibri storage ls

  List all files in the 'assets' bucket

    $ colibri storage ls assets
```

## `colibri storage make-bucket BUCKET`

Create a new storage bucket.

```
USAGE
  $ colibri storage make-bucket BUCKET [--json] [-c <value>] [-i <value>] [-v]

ARGUMENTS
  BUCKET  Name of the bucket to create

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Create a new storage bucket.

ALIASES
  $ colibri storage mb

EXAMPLES
  Create a new bucket named 'assets'

    $ colibri storage make-bucket assets
```

_See code: [src/commands/storage/make-bucket.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/storage/make-bucket.ts)_

## `colibri storage mb BUCKET`

Create a new storage bucket.

```
USAGE
  $ colibri storage mb BUCKET [--json] [-c <value>] [-i <value>] [-v]

ARGUMENTS
  BUCKET  Name of the bucket to create

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Create a new storage bucket.

ALIASES
  $ colibri storage mb

EXAMPLES
  Create a new bucket named 'assets'

    $ colibri storage mb assets
```

## `colibri storage move BUCKET DESTINATION SOURCE`

Move a file or folder in storage.

```
USAGE
  $ colibri storage move BUCKET DESTINATION SOURCE [--json] [-c <value>] [-i <value>] [-v]

ARGUMENTS
  BUCKET       Name of the bucket to move the file in
  DESTINATION  Destination path to move to
  SOURCE       Source path to move

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Move a file or folder in storage.

ALIASES
  $ colibri storage mv

EXAMPLES
  Move 'old-folder' to 'new-folder'

    $ colibri storage move assets/old-folder assets/new-folder
```

_See code: [src/commands/storage/move.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/storage/move.ts)_

## `colibri storage mv BUCKET DESTINATION SOURCE`

Move a file or folder in storage.

```
USAGE
  $ colibri storage mv BUCKET DESTINATION SOURCE [--json] [-c <value>] [-i <value>] [-v]

ARGUMENTS
  BUCKET       Name of the bucket to move the file in
  DESTINATION  Destination path to move to
  SOURCE       Source path to move

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Move a file or folder in storage.

ALIASES
  $ colibri storage mv

EXAMPLES
  Move 'old-folder' to 'new-folder'

    $ colibri storage mv assets/old-folder assets/new-folder
```

## `colibri storage rb BUCKET`

Remove a storage bucket.

```
USAGE
  $ colibri storage rb BUCKET [--json] [-c <value>] [-i <value>] [-v]

ARGUMENTS
  BUCKET  Name of the bucket to create

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Remove a storage bucket.

ALIASES
  $ colibri storage rb

EXAMPLES
  Remove the bucket named 'assets'

    $ colibri storage rb assets
```

## `colibri storage remove KEYS`

Remove an object from a storage bucket.

```
USAGE
  $ colibri storage remove KEYS... [--json] [-c <value>] [-i <value>] [-v] [-f]

ARGUMENTS
  KEYS...  One or more objects to remove

FLAGS
  -f, --force  Force remove the object(s) without confirmation

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Remove an object from a storage bucket.

ALIASES
  $ colibri storage rm
```

_See code: [src/commands/storage/remove.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/storage/remove.ts)_

## `colibri storage remove-bucket BUCKET`

Remove a storage bucket.

```
USAGE
  $ colibri storage remove-bucket BUCKET [--json] [-c <value>] [-i <value>] [-v]

ARGUMENTS
  BUCKET  Name of the bucket to create

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Remove a storage bucket.

ALIASES
  $ colibri storage rb

EXAMPLES
  Remove the bucket named 'assets'

    $ colibri storage remove-bucket assets
```

_See code: [src/commands/storage/remove-bucket.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/storage/remove-bucket.ts)_

## `colibri storage rm KEYS`

Remove an object from a storage bucket.

```
USAGE
  $ colibri storage rm KEYS... [--json] [-c <value>] [-i <value>] [-v] [-f]

ARGUMENTS
  KEYS...  One or more objects to remove

FLAGS
  -f, --force  Force remove the object(s) without confirmation

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Remove an object from a storage bucket.

ALIASES
  $ colibri storage rm
```

## `colibri users`

List all users.

```
USAGE
  $ colibri users [--json] [-c <value>] [-i <value>] [-v] [-f <value>...] [-p <value>] [-P <value>]

FLAGS
  -P, --per-page=<value>   [default: ∞] Number of items per page.
  -f, --filter=<value>...  Filter users by a specific attribute.
  -p, --page=<value>       [default: 1] Page number to fetch.

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  List all users.

EXAMPLES
  $ colibri users

  $ colibri users --instance https://colibri.example.com
```

_See code: [src/commands/users/index.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/users/index.ts)_

## `colibri users add EMAIL`

Add a new user.

```
USAGE
  $ colibri users add EMAIL [--json] [-c <value>] [-i <value>] [-v] [--birthdate <value>] [--colorScheme
    light|dark|system] [--name <value>] [-r admin|adult|child|guest] [--verified]

ARGUMENTS
  EMAIL  Email address of the new user

FLAGS
  -r, --role=<option>         [default: adult] Role of the new user.
                              <options: admin|adult|child|guest>
      --birthdate=<value>     Birthdate of the new user.
      --colorScheme=<option>  [default: system] Color scheme of the new user.
                              <options: light|dark|system>
      --name=<value>          Name of the new user.
      --verified              Whether the new user is verified and does not need to verify their email address.

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Add a new user.

EXAMPLES
  $ colibri users add jane.doe@gmail.com --name Jane
```

_See code: [src/commands/users/add.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/users/add.ts)_

## `colibri users remove USER`

Remove a user from your Colibri instance.

```
USAGE
  $ colibri users remove USER [--json] [-c <value>] [-i <value>] [-v] [-f]

ARGUMENTS
  USER  Email address or ID of the user to remove.

FLAGS
  -f, --force  Force the removal without confirmation.

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Remove a user from your Colibri instance.

EXAMPLES
  Remove a user by email address:

    $ colibri users remove jane@doe.com

  Remove a user by ID:

    $ colibri users remove 42

  Remove a user by ID from a specific Colibri instance:

    $ colibri users remove 42 --instance https://colibri.example.com
```

_See code: [src/commands/users/remove.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/users/remove.ts)_

## `colibri users update USER`

Update a user's information.

```
USAGE
  $ colibri users update USER [--json] [-c <value>] [-i <value>] [-v] [--birthdate <value>] [--colorScheme
    light|dark|system] [--name <value>] [-r admin|adult|child|guest] [--verified]

ARGUMENTS
  USER  Email address or ID of the user to update.

FLAGS
  -r, --role=<option>         Role of the user.
                              <options: admin|adult|child|guest>
      --birthdate=<value>     Birthdate of the user.
      --colorScheme=<option>  Color scheme preference of the user.
                              <options: light|dark|system>
      --name=<value>          Name of the user.
      --verified              Whether the user is verified.

GLOBAL FLAGS
  -c, --config-file=<value>  [default: (nearest config file)] Configuration file to use.
  -i, --instance=<value>     The URL of your Colibri instance.
  -v, --verbose              Show verbose output.
      --json                 Format output as json.

DESCRIPTION
  Update a user's information.

EXAMPLES
  Update a user's name by email address:

    $ colibri users update jane@doe.com --name "Jane Doe"

  Update a user's role by ID:

    $ colibri users update 42 --role admin

  Update a user's color scheme by ID from a specific Colibri instance:

    $ colibri users update 42 --instance https://colibri.example.com --color-scheme dark
```

_See code: [src/commands/users/update.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/users/update.ts)_

<!-- commandsstop -->
