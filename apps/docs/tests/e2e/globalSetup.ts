/**
 * Global setup for e2e tests.
 * Starts a Vite dev server before tests run and shuts it down after.
 */
import { type ViteDevServer, createServer } from "vite";

let server: ViteDevServer | undefined;

export async function setup() {
  // Check if a server is already running on port 5174
  try {
    const response = await fetch("http://localhost:5174", { method: "HEAD" });
    if (response.ok) {
      console.log("Dev server already running on port 5174, reusing it");
      return;
    }
  } catch {
    // Server not running, we'll start one
  }

  console.log("Starting Vite dev server for e2e tests...");

  server = await createServer({
    configFile: new URL("../../vite.config.ts", import.meta.url).pathname,
    server: { port: 5174, strictPort: true },
  });

  await server.listen();
  console.log("Vite dev server started on http://localhost:5174");
}

export async function teardown() {
  if (server) {
    console.log("Shutting down Vite dev server...");
    await server.close();
    console.log("Vite dev server shut down");
  }
}
