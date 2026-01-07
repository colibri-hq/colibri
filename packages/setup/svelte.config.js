import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import("@sveltejs/kit").Config} */
const config = {
  compilerOptions: {
    discloseVersion: true,
    modernAst: true,
  },
  kit: {
    appDir: "_app",
    outDir: ".svelte-kit",
  },
  preprocess: vitePreprocess(),
};

export default config;
