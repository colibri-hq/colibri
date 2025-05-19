import { removeObjects } from "@colibri-hq/sdk/storage";
import { Args } from "@oclif/core";
import { StorageBaseCommand } from "../../domain/storage/command.ts";
import { force } from "../../flags/force.ts";
import { withConfirmation } from "../../utils/interactive.ts";

export class Remove extends StorageBaseCommand<typeof Remove> {
  static aliases = ["storage rm"];
  static args = {
    keys: Args.string({
      description: "One or more objects to remove",
      name: "objects",
      required: true,
    }),
  };
  static description = "Remove an object from a storage bucket.";
  static examples = [];
  static flags = {
    force: force({
      description: "Force remove the object(s) without confirmation",
    }),
  };
  /**
   * Disable strict argument parsing to allow for multiple objects to be passed
   */
  static strict = false;

  async run() {
    const objects = this.rawArgs.filter(Boolean);

    const operation = await withConfirmation(
      async () => {
        const keysByBucket = new Map<string, Set<string>>();

        for (let ref of objects) {
          if (!ref.includes("://")) {
            ref = `s3://${ref}`;
          }

          const { hostname: bucket, pathname: key } = new URL(ref);
          const keys = keysByBucket.get(bucket) ?? new Set<string>();
          keys.add(key.replace(/^\//, ""));
          keysByBucket.set(bucket, keys);
        }

        await Promise.all(
          keysByBucket
          .entries()
          .map(async ([bucket, keys]) =>
            removeObjects(this.storage, bucket, [...keys]),
          ),
        );
      },
      `Are you sure you want to remove the object(s) "${objects.join('", "')}"? This action cannot be undone!`,
      { shortCircuit: this.flags.force },
    );

    await operation();

    if (this.flags.verbose) {
      this.logToStderr(
        `Removed ${objects.length} object(s) successfully.`,
      );
    }
  }
}
