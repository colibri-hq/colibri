#!/usr/bin/env node --title=colibri --enable-source-maps --report-signal=SIGINFO
import { execute } from "@oclif/core";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile();
} catch {
  // no-op
}

await execute({ dir: import.meta.url });
