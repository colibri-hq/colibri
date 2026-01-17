import { loadSettings, updateSettings } from "@colibri-hq/sdk";
import { Args } from "@oclif/core";
import { BaseCommand } from "../../command.ts";

export class Set extends BaseCommand<typeof Set> {
  static args = {
    key: Args.string({ description: "The settings key to set.", required: true }),
    value: Args.string({ description: "The value of the setting to set.", required: true }),
  };
  static description = "Set the global instance settings.";
  static examples = ["<%= config.bin %> <%= command.id %> ui.colorMode dark"];

  async run() {
    const { key, value } = this.args;
    const { data } = await loadSettings(this.instance.database);

    if (!data || !(typeof data === "object") || Array.isArray(data)) {
      this.logToStderr("Settings data is corrupted.");

      this.exit(1);
    }

    try {
      await updateSettings(this.instance.database, { data: { ...data, [key]: value } });
    } catch (error) {
      this.error(`Failed to update settings: ${error}`);
    }

    if (this.flags.verbose) {
      this.log(`Setting ${key} updated to ${value}`);
    }
  }
}
