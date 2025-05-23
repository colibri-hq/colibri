import type { JsonObject } from "@colibri-hq/sdk/schema";
import { loadSettings } from "@colibri-hq/sdk";
import { BaseCommand } from "../../command.ts";
import { indent } from "../../utils/indent.ts";
import { listing } from "../../utils/listing.ts";

export class Get extends BaseCommand<typeof Get> {
  static aliases = ["settings"];
  static description = "Get the global instance settings.";
  static examples = [];

  async run(): Promise<JsonObject> {
    const { data } = await loadSettings(this.instance.database);

    if (!data || !(typeof data === "object") || Array.isArray(data)) {
      this.logToStderr("Settings data is corrupted.");

      this.exit(1);
    }

    this.logToStderr("");
    this.log(indent(listing(data), 2));
    this.logToStderr("");

    return data;
  }
}
