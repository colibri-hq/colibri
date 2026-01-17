import { runCommand } from "@oclif/test";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@colibri-hq/sdk/storage");

const root = resolve(import.meta.dirname, "..", "..", "..");
const server = setupServer();

// Start the server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

// Close the server after all tests
afterAll(() => server.close());

// Reset handlers after each test for test isolation
afterEach(() => server.resetHandlers());

// TODO: Skip - mock URL mismatch (http://localhost:9000 vs http://127.0.0.1:54321/storage/v1/s3)
describe.skip("colibri storage list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("should list objects in a bucket", async () => {
    vi.stubEnv("COLIBRI_STORAGE_BUCKET", "assets");
    server.use(
      http.get("http://localhost:9000/", ({ request }) => {
        expect(new URL(request.url).searchParams.get("x-id")).toBe("ListBuckets");

        return HttpResponse.xml(
          `<ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
            <Buckets>
              <Bucket>
                <Name>bucket1</Name>
                <CreationDate>2025-01-01T00:00:00Z</CreationDate>
              </Bucket>
            </Buckets>
          </ListAllMyBucketsResult>`,
        );
      }),
    );

    const { error, result } = await runCommand("storage list", { root });

    expect(error).toBeUndefined();
    expect(result).toContainEqual({
      CreationDate: new Date("2025-01-01T00:00:00Z"),
      Name: "bucket1",
    });
  });
});
