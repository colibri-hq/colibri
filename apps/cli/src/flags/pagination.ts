import { Flags } from "@oclif/core";

export const page = () =>
  Flags.integer({
    char: "p",
    default: 1,
    description: "Page number to fetch.",
    min: 1,
    name: "page",
    required: false,
  });

export const perPage = () =>
  Flags.integer({
    char: "P",
    default: Infinity,
    async defaultHelp() {
      return "∞";
    },
    description: "Number of items per page.",
    min: 1,
    name: "per-page",
    required: false,
  });
