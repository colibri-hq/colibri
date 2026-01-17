import * as oauth from "@colibri-hq/oauth";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "../database.js";
import { server } from "./server.js";

describe("Server", () => {
  const database = vi.mocked<Database>({} as Database);

  it("should be a test", () => {
    const createAuthorizationServer = vi.spyOn(oauth, "createAuthorizationServer");

    server(database, { issuer: "https://example.com", jwtSecret: "" });

    expect(createAuthorizationServer).toHaveBeenCalledOnce();
  });
});
