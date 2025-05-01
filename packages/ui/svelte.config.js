import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import("@sveltejs/kit").Config} */
const config = {
  compilerOptions: {
    modernAst: true,
    discloseVersion: true,
  },
  kit: {
    adapter: adapter({
      pages: "dist/preview",
      assets: "dist/preview",
      precompress: true,
      strict: true,
    }),
  },
  preprocess: vitePreprocess(),
};

export default config;
