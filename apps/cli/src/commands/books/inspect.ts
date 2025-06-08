import { loadMetadata, relatorLabels } from "@colibri-hq/sdk/ebooks";
import { humanReadableFileSize } from "@colibri-hq/shared";
import { Args } from "@oclif/core";
import { bgBlueBright, bold, dim } from "ansis";
import { subtle } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { BaseCommand } from "../../command.ts";
import { hyperlink } from "../../utils/rendering.js";
import { divider, invisibleTheme, table } from "../../utils/tables.js";

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
    "<%= config.bin %> <%= command.id %> some-file.epub",
  ];

  public async run() {
    const { file: path } = this.args;
    const buffer = await readFile(path);
    const file = new File([buffer], basename(path));
    const metadata = await loadMetadata(file);
    const checksum = await subtle.digest("SHA-256", buffer);

    const start = process.hrtime.bigint();
    if (!this.flags.json) {
      this.log(
        table(
          [
            { key: "Title", value: bold(metadata.title) },
            {
              key: "Contributors",
              value:
                metadata.contributors
                  ?.map(({ name, roles }) => {
                    const roleLabels = roles
                      ?.map((role) => relatorLabels[role] ?? role)
                      .join(", ");

                    return `${name} (${roleLabels})`;
                  })
                  ?.join("\n") || undefined,
            },
            { key: "Synopsis", value: metadata.synopsis },
            divider,
            {
              key: "Tags",
              value:
                metadata.tags
                  ?.map((tag) => bgBlueBright(` ${tag} `))
                  ?.join(" ") || undefined,
            },
            { key: "Language", value: metadata.language },
            {
              key: "Number of Pages",
              value: metadata.numberOfPages?.toString(),
            },
            {
              key: "Legal Information",
              value: metadata.legalInformation,
            },
            {
              key: "Date Created",
              value: metadata.dateCreated?.toLocaleString(
                this.flags.displayLocale,
              ),
            },
            {
              key: "Date Modified",
              value: metadata.dateModified?.toLocaleString(
                this.flags.displayLocale,
              ),
            },
            {
              key: "Date Published",
              value: metadata.datePublished?.toLocaleString(
                this.flags.displayLocale,
              ),
            },
            {
              key: "Identifiers",
              value: metadata.identifiers
                ?.map(({ type, value }) => `${type}:${value}`)
                .join(", "),
            },
            { key: "Page Progression", value: metadata.pageProgression },
            divider,
            {
              key: "File Name",
              value: hyperlink(new URL(`file://${path}`), file.name),
            },
            { key: "File Size", value: humanReadableFileSize(file.size) },
            {
              key: "Checksum",
              value: Buffer.from(checksum)
                .toString("hex")
                .split(/(.{1,6})/)
                .filter(Boolean)
                .join(" "),
            },
            ...(this.flags.verbose
              ? ([
                  divider,
                  ...Object.entries(metadata.properties ?? {}).map(
                    ([key, value]) => ({
                      key: `Extra Property: ${key}`,
                      value:
                        typeof value === "string"
                          ? value
                          : JSON.stringify(value),
                    }),
                  ),
                ] as const)
              : []),
          ],
          [
            {
              format: (value?: string) => dim(value),
              justify: "end",
              name: "key",
              wrap: false,
            },
            { justify: "start", name: "value" },
          ],
          {
            displayHeader: false,
            theme: invisibleTheme,
          },
        ),
      );
    }
    const end = process.hrtime.bigint();
    console.log(`Rendered table in ${Number(end - start) / 1_000_000} ms`);

    return metadata;
  }
}
