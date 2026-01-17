import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface GuiServerOptions {
  open?: boolean;
  port: number;
}

export async function startGuiServer(options: GuiServerOptions): Promise<void> {
  const { open = true, port } = options;

  // Resolve the package root (where svelte.config.js and vite.config.ts are)
  const packageRoot = resolve(__dirname, "../..");

  const server = await createServer({ root: packageRoot, server: { port, strictPort: false } });

  await server.listen();

  const address = server.resolvedUrls?.local?.[0] ?? `http://localhost:${port}`;

  // oxlint-disable no-console
  console.info(`\n  Colibri Setup Wizard`);
  console.info(`  ────────────────────`);
  console.info(`  Running at: ${address}`);
  console.info(`\n  Press Ctrl+C to stop\n`);
  // oxlint-enable no-console

  // Open browser
  if (open) {
    const openModule = await import("open");
    await openModule.default(address);
  }

  // Keep process running
  await new Promise(() => {});
}
