#!/usr/bin/env -S node --disable-warning=ExperimentalWarning --title=colibri --enable-source-maps --report-signal=SIGINFO
import { execute } from "@oclif/core";

process.on("warning", (err) => {
  if (err.name !== "ExperimentalWarning") {
    console.warn(err);
  }
});

await execute({ development: true, dir: import.meta.url });
