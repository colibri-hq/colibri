#!/usr/bin/env node --enable-source-maps
import { execute } from "@oclif/core";

await execute({ dir: import.meta.url });
