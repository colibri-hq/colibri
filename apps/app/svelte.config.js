import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import("@sveltejs/kit").Config} */
const config = {
  preprocess: vitePreprocess(),
  compilerOptions: { discloseVersion: true, modernAst: true },
  kit: {
    adapter: adapter({ out: "dist", precompress: true, envPrefix: "COLIBRI_" }),
    csrf: { trustedOrigins: ["*"] },
    prerender: { handleHttpError: "warn" },
    env: { dir: "../.." },
    typescript: {
      config(config) {
        return {
          ...config,
          include: [
            ...config.include,
            "../src/routes/.well-known/**/*.ts",
            "../src/routes/.well-known/**/*.svelte",
          ],
        };
      },
    },
  },
};

export default config;
