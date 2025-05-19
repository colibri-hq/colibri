import { Flags } from "@oclif/core";

export const force = ({ description }: { description?: string } = {}) =>
  Flags.boolean({
    char: "f",
    default: false,
    description: description ?? "Force the action without confirmation.",
    name: "force",
  });
