import { json } from "@sveltejs/kit";
import { uptime } from "node:process";
import type { RequestHandler } from "./$types";
import packageJson from "../../../../package.json" with { type: "json" };

const { version: releaseId } = packageJson;

export const GET = function handler() {
  return json(
    {
      status: "ok",
      version: releaseId.split(".", 1).pop(),
      releaseId,
      timestamp: new Date().toISOString(),
      checks: { uptime: uptimeCheck() },
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/health+json",
        "Cache-Control": "max-age=3600, public",
      },
    },
  );
} satisfies RequestHandler;

function uptimeCheck() {
  return {
    componentType: "system",
    observedValue: uptime(),
    observedUnit: "s",
    status: "pass",
    time: new Date().toISOString(),
  };
}
