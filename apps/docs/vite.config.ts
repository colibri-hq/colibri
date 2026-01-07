import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import { pagefindPlugin } from "./src/build/vite-plugin-pagefind";
import packageJson from "./package.json" with { type: "json" };
import { cwd } from "node:process";
import { resolve } from "path";

const {
  bugs,
  config: { contentDir },
  homepage,
  repository,
} = packageJson;

export default defineConfig({
  build: {
    rollupOptions: {
      // Pagefind is dynamically loaded at runtime, not bundled
      external: ["/pagefind/pagefind.js"],
    },
  },
  define: {
    PACKAGE_REPOSITORY_URL: `"${repository.url}"`,
    PACKAGE_HOMEPAGE_URL: `"${homepage}"`,
    PACKAGE_BUGS_URL: `"${bugs.url}"`,
    CONTENT_ROOT_DIR: `"${resolve(import.meta.dirname, contentDir).replace(import.meta.dirname, "")}"`,
    // Site URL from environment variable, with fallback for development
    SITE_URL: `"${process.env.SITE_URL ?? "http://localhost:5174"}"`,
  },
  plugins: [tailwindcss(), sveltekit(), pagefindPlugin({ contentDir })],
  resolve: {
    alias: {
      $content: resolve(import.meta.dirname, contentDir),
      $components: resolve(import.meta.dirname, "src/lib/components"),
      $root: import.meta.dirname,
    },
  },
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(cwd())],
    },
    open: false,
    port: 5174,
    strictPort: true,
  },
});
