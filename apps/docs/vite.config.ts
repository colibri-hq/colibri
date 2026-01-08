import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import { pagefindPlugin } from "./src/build/vite-plugin-pagefind.ts";
import packageJson from "./package.json" with { type: "json" };
import { cwd } from "node:process";
import { resolve } from "node:path";

const {
  bugs,
  config: { contentDir },
  homepage,
  repository,
} = packageJson;
const contentRoot = resolve(import.meta.dirname, contentDir);

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
    CONTENT_ROOT_DIR: `"${contentRoot.replace(import.meta.dirname, "")}"`,
    CONTENT_ROOT_REPOSITORY_PATH: `"${contentRoot.replace(resolve(import.meta.dirname, "../../"), "")}"`,
  },
  plugins: [
    tailwindcss(),
    sveltekit(),
    pagefindPlugin({ contentDir: contentRoot }),
  ],
  resolve: {
    alias: {
      $content: contentRoot,
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
