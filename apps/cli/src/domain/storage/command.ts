import { type Client, client } from "@colibri-hq/sdk/storage";
import { Command } from "@oclif/core";
import { inspect } from "node:util";
import {
  type Args,
  BaseCommand,
  type Flags as BaseFlags,
} from "../../command.ts";
import { box } from "../../utils/box.ts";

export abstract class StorageBaseCommand<
  T extends typeof Command,
> extends BaseCommand<T> {
  static baseFlags = { ...BaseCommand.baseFlags };
  declare protected args: Args<T>;
  declare protected flags: BaseFlags<T, typeof StorageBaseCommand>;
  #client: Client | undefined;

  protected get storage(): Client {
    if (!this.#client) {
      const options = this.instance.config.storage;

      if (!options) {
        this.error(
          "No storage provider configured. Use the 'storage config set' command to configure one.",
        );
      }

      this.#client = client({
        ...options,
        clientOptions: {
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
                this.logToStderr(
                  box(args.join(" "), { title: "Storage: Info" }),
                );
              }
            },
            trace() {
            },
            warn: (...args) => {
              if (this.flags.verbose) {
                this.logToStderr(
                  box(args.join(" "), { title: "Storage: Warning" }),
                );
              }
            },
          },
        },
      });
    }

    return this.#client;
  }
}
