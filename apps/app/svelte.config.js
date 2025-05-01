import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import("@sveltejs/kit").Config} */
const config = {
  preprocess: vitePreprocess(),
  compilerOptions: {
    discloseVersion: true,
    modernAst: true,
  },
  kit: {
    adapter: adapter({
      out: "dist",
      precompress: true,
      envPrefix: "COLIBRI_",
    }),
    csrf: {
      checkOrigin: false,
    },
    prerender: {
      handleHttpError: "warn",
    },
    env: {
      dir: "../..",
    },
  },
};

export default config;
