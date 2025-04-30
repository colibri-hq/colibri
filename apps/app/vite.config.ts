import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import packageJson from "./package.json" with { type: "json" };

const { homepage, bugs, repository } = packageJson;

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  build: {
    commonjsOptions: {
      esmExternals: ["pg-cloudflare"],
    },
  },
  worker: {
    plugins: () => [sveltekit()],
    format: "es",
  },
  define: {
    PACKAGE_REPOSITORY_URL: `"${repository.url}"`,
    PACKAGE_HOMEPAGE_URL: `"${homepage}"`,
    PACKAGE_BUGS_URL: `"${bugs.url}"`,
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
});
