@colibri-hq/cli
=================

The command-line interface for Colibri, an ebook management app


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@colibri-hq/cli.svg)](https://npmjs.org/package/@colibri-hq/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@colibri-hq/cli.svg)](https://npmjs.org/package/@colibri-hq/cli)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
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
* [`colibri hello PERSON`](#colibri-hello-person)
* [`colibri hello world`](#colibri-hello-world)
* [`colibri help [COMMAND]`](#colibri-help-command)
* [`colibri login`](#colibri-login)
* [`colibri plugins`](#colibri-plugins)
* [`colibri plugins add PLUGIN`](#colibri-plugins-add-plugin)
* [`colibri plugins:inspect PLUGIN...`](#colibri-pluginsinspect-plugin)
* [`colibri plugins install PLUGIN`](#colibri-plugins-install-plugin)
* [`colibri plugins link PATH`](#colibri-plugins-link-path)
* [`colibri plugins remove [PLUGIN]`](#colibri-plugins-remove-plugin)
* [`colibri plugins reset`](#colibri-plugins-reset)
* [`colibri plugins uninstall [PLUGIN]`](#colibri-plugins-uninstall-plugin)
* [`colibri plugins unlink [PLUGIN]`](#colibri-plugins-unlink-plugin)
* [`colibri plugins update`](#colibri-plugins-update)

## `colibri hello PERSON`

Say hello

```
USAGE
  $ colibri hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ colibri hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/hello/index.ts)_

## `colibri hello world`

Say hello world

```
USAGE
  $ colibri hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ colibri hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/hello/world.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.27/src/commands/help.ts)_

## `colibri login`

Login to your Colibri instance

```
USAGE
  $ colibri login -u <value>

FLAGS
  -u, --url=<value>  (required) The URL of your Colibri instance

DESCRIPTION
  Login to your Colibri instance
```

_See code: [src/commands/login.ts](https://github.com/colibri-hq/colibri/blob/v0.0.1/src/commands/login.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/index.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/inspect.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/install.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/link.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/reset.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/uninstall.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/update.ts)_
<!-- commandsstop -->
