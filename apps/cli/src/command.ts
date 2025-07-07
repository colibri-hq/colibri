import { storage, type Storage } from "@colibri-hq/sdk/storage";
import { Command, Flags, Interfaces } from "@oclif/core";
import { inspect } from "node:util";
import type { Config } from "./utils/config.ts";
import { config } from "./flags/config.ts";
import { box } from "./utils/box.ts";
import { configureInstance } from "./utils/instance.ts";
import { Aborted } from "./utils/interactive.ts";

export type Flags<
  T extends typeof Command,
  U extends typeof BaseCommand,
> = Interfaces.InferredFlags<T["flags"] & U["baseFlags"]>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;

export abstract class BaseCommand<T extends typeof Command> extends Command {
  static baseFlags = {
    "config-file": config({
      helpGroup: "GLOBAL",
    }),
    displayLocale: Flags.string({
      async default() {
        return (process.env.LC_TIME ?? process.env.LC_ALL ?? process.env.TZ)
          ?.replace("_", "-")
          .split(".", 1)
          .shift();
      },
      description: "The locale to use for displaying messages.",
      env: "COLIBRI_DISPLAY_LOCALE",
      hidden: true,
    }),
    instance: Flags.string({
      char: "i",
      description: "The URL of your Colibri instance.",
      env: "COLIBRI_INSTANCE",
      helpGroup: "GLOBAL",
      multiple: false,
      async parse(input) {
        if (input && !input.startsWith("http")) {
          input = `http://${input.replace(/^.*:\/\//, "")}`;
        }

        return input;
      },
    }),
    verbose: Flags.boolean({
      char: "v",
      description: "Show verbose output.",
      helpGroup: "GLOBAL",
    }),
  };
  static enableJsonFlag = true;
  protected args!: Args<T>;
  protected colibriConfig!: Config;
  protected flags!: Flags<T, typeof BaseCommand>;
  protected rawArgs!: string[];

  #instance: ReturnType<typeof configureInstance> | undefined;

  #storage: Promise<Storage> | undefined;

  protected get instance() {
    if (!this.#instance) {
      const uri = this.flags.instance ?? this.colibriConfig?.defaultInstance;

      if (!uri) {
        throw new Error(
          "No instance specified and no default instance found. " +
            'Please run "colibri connect" first.',
        );
      }

      this.#instance = configureInstance(uri, this.colibriConfig);
    }

    return this.#instance;
  }

  protected get storage() {
    if (!this.#storage) {
      this.#storage = storage(this.instance.database, {
        logger: {
          debug: (...args) => {
            if (this.flags.verbose) {
              this.logToStderr(
                box(args.join(" "), { title: "Storage: Debug" }),
              );
            }
          },
          error: (...args) => {
            this.logToStderr(box(inspect(args), { title: "Storage: Error" }));
          },
          info: (...args) => {
            if (this.flags.verbose) {
              this.logToStderr(box(args.join(" "), { title: "Storage: Info" }));
            }
          },
          trace() {},
          warn: (...args) => {
            if (this.flags.verbose) {
              this.logToStderr(
                box(args.join(" "), { title: "Storage: Warning" }),
              );
            }
          },
        },
      });
    }

    return this.#storage;
  }

  public async init() {
    await super.init();

    const { args, argv, flags } = await this.parse({
      args: this.ctor.args,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    });

    this.flags = flags as Flags<T, typeof BaseCommand>;
    this.args = args as Args<T>;
    this.rawArgs = argv.map((arg) => String(arg).trim());
    this.colibriConfig = await flags["config-file"].load();
  }

  protected async catch(err: Error & { exitCode?: number }) {
    if (err.cause === Aborted) {
      this.logToStderr("Aborted.");
      this.exit(2);
    }

    return super.catch(err);
  }

  protected async finally(error: Error | undefined) {
    try {
      await this.instance.database?.destroy();
    } catch {
      // no-op
    }

    return super.finally(error);
  }
}
