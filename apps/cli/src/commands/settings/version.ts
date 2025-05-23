import { loadSettings } from "@colibri-hq/sdk";
import { BaseCommand } from "../../command.ts";

export class Version extends BaseCommand<typeof Version> {
  static override description = "Show settings version information.";

  async run() {
    const {
      created_at: createdAt,
      updated_at: updatedAt,
      updated_by: updatedBy,
      version,
    } = await loadSettings(this.instance.database);

    this.log("Version:", version);
    this.log("Last Updated:", updatedAt?.toLocaleString() ?? "Never");

    if (updatedBy) {
      this.log("Last Modified by:", `${updatedBy.name} (${updatedBy.email})`);
    }

    return { createdAt, updatedAt, updatedBy, version };
  }
}
