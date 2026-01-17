import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { cwd } from "node:process";
import { defineConfig, searchForWorkspaceRoot } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: { fs: { allow: [searchForWorkspaceRoot(cwd())] }, port: 3333, strictPort: false },
});
