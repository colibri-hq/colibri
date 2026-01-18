import { config } from "@colibri-hq/shared/vitest.config";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(config, defineConfig({ test: { disableConsoleIntercept: true } }));
