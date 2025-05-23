import { loadMetadata } from "@colibri-hq/sdk/ebooks";
import { Args } from "@oclif/core";
import { subtle } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { BaseCommand } from "../../command.ts";

export default class Inspect extends BaseCommand<typeof Inspect> {
  static override args = {
    file: Args.file({
      description: "The file to inspect",
      exists: true,
      name: "file",
      required: true,
    }),
  };
  static override description = "Inspect an ebook file";
  static override examples = [
    "<%= config.bin %> <%= command.id %> somefile.epub",
  ];

  public async run() {
    const { file: path } = this.args;
    const buffer = await readFile(path);
    const file = new File([buffer], basename(path));
    const metadata = await loadMetadata(file);
    const checksum = await subtle.digest("SHA-256", buffer);
    console.log({ checksum, file, metadata });

    // TODO: Create the database entries
    // TODO: Upload the asset
  }
}
