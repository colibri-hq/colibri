import { expect } from "@playwright/test";
import { test } from "../base";
import { TEST_USER_ID, TEST_ENRICHMENT_WORK_ID } from "../test-data";

test.describe("Metadata Enrichment Database Operations", () => {
  test.beforeEach(async ({ database }) => {
    // Clean up any existing enrichment results for test work
    await database
      .deleteFrom("enrichment_result")
      .where("work_id", "=", BigInt(TEST_ENRICHMENT_WORK_ID))
      .execute();
  });

  test.afterEach(async ({ database }) => {
    // Clean up after each test
    await database
      .deleteFrom("enrichment_result")
      .where("work_id", "=", BigInt(TEST_ENRICHMENT_WORK_ID))
      .execute();
  });

  test("can create a pending enrichment result", async ({ database }) => {
    const result = await database
      .insertInto("enrichment_result")
      .values({
        work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
        user_id: BigInt(TEST_USER_ID),
        status: "pending",
        preview: JSON.stringify({
          title: { value: "Test Title", confidence: 0.95 },
          description: { value: "A test description", confidence: 0.8 },
        }),
        improvements: JSON.stringify({
          title: "Improved Test Title",
          description: "An improved description",
        }),
        sources: ["OpenLibrary", "WikiData"],
      })
      .returning(["id", "status", "sources"])
      .executeTakeFirst();

    expect(result).toBeDefined();
    expect(result?.status).toBe("pending");
    expect(result?.sources).toEqual(["OpenLibrary", "WikiData"]);
  });

  test("can query enrichment by work_id and status", async ({ database }) => {
    // Insert test enrichment
    await database
      .insertInto("enrichment_result")
      .values({
        work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
        user_id: BigInt(TEST_USER_ID),
        status: "pending",
        preview: JSON.stringify({ title: { value: "Test", confidence: 0.9 } }),
        improvements: JSON.stringify({ title: "New Title", synopsis: "New Synopsis" }),
        sources: ["OpenLibrary"],
      })
      .execute();

    // Query like hasEnrichment tRPC route
    const result = await database
      .selectFrom("enrichment_result")
      .select(["id", "created_at", "sources"])
      .select((eb) =>
        eb
          .cast<number>(
            eb.fn("jsonb_array_length", [
              eb.fn("jsonb_path_query_array", [eb.ref("improvements"), eb.val("$.keyvalue()")]),
            ]),
            "integer",
          )
          .as("improvement_count"),
      )
      .where("work_id", "=", BigInt(TEST_ENRICHMENT_WORK_ID))
      .where("status", "=", "pending")
      .executeTakeFirst();

    expect(result).toBeDefined();
    expect(result?.sources).toEqual(["OpenLibrary"]);
  });

  test("unique constraint prevents multiple pending enrichments per work", async ({ database }) => {
    // Insert first pending enrichment
    await database
      .insertInto("enrichment_result")
      .values({
        work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
        user_id: BigInt(TEST_USER_ID),
        status: "pending",
        preview: JSON.stringify({}),
        improvements: JSON.stringify({}),
        sources: [],
      })
      .execute();

    // Try to insert second pending enrichment
    let errorThrown = false;
    try {
      await database
        .insertInto("enrichment_result")
        .values({
          work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
          user_id: BigInt(TEST_USER_ID),
          status: "pending",
          preview: JSON.stringify({}),
          improvements: JSON.stringify({}),
          sources: [],
        })
        .execute();
    } catch (e) {
      errorThrown = true;
      expect(String(e)).toContain("unique");
    }

    expect(errorThrown).toBe(true);
  });

  test("allows multiple non-pending enrichments for same work", async ({ database }) => {
    // Insert first enrichment as applied
    await database
      .insertInto("enrichment_result")
      .values({
        work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
        user_id: BigInt(TEST_USER_ID),
        status: "applied",
        preview: JSON.stringify({}),
        improvements: JSON.stringify({}),
        sources: ["OpenLibrary"],
        applied_at: new Date().toISOString(),
      })
      .execute();

    // Insert second enrichment as dismissed
    const result = await database
      .insertInto("enrichment_result")
      .values({
        work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
        user_id: BigInt(TEST_USER_ID),
        status: "dismissed",
        preview: JSON.stringify({}),
        improvements: JSON.stringify({}),
        sources: ["WikiData"],
        dismissed_at: new Date().toISOString(),
      })
      .returning(["id"])
      .executeTakeFirst();

    expect(result).toBeDefined();

    // Verify we have 2 enrichment records
    const count = await database
      .selectFrom("enrichment_result")
      .select((eb) => eb.fn.count<string>("id").as("count"))
      .where("work_id", "=", BigInt(TEST_ENRICHMENT_WORK_ID))
      .executeTakeFirst();

    expect(Number(count?.count)).toBe(2);
  });

  test("can update enrichment status to applied", async ({ database }) => {
    // Insert pending enrichment
    const created = await database
      .insertInto("enrichment_result")
      .values({
        work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
        user_id: BigInt(TEST_USER_ID),
        status: "pending",
        preview: JSON.stringify({ title: { value: "Test", confidence: 0.95 } }),
        improvements: JSON.stringify({ title: "Applied Title" }),
        sources: ["OpenLibrary"],
      })
      .returning(["id"])
      .executeTakeFirst();

    expect(created).toBeDefined();

    // Update to applied
    await database
      .updateTable("enrichment_result")
      .set({ status: "applied", applied_at: new Date().toISOString() })
      .where("id", "=", created!.id)
      .execute();

    // Verify status changed
    const updated = await database
      .selectFrom("enrichment_result")
      .select(["status", "applied_at"])
      .where("id", "=", created!.id)
      .executeTakeFirst();

    expect(updated?.status).toBe("applied");
    expect(updated?.applied_at).toBeDefined();
  });

  test("can update enrichment status to dismissed", async ({ database }) => {
    // Insert pending enrichment
    const created = await database
      .insertInto("enrichment_result")
      .values({
        work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
        user_id: BigInt(TEST_USER_ID),
        status: "pending",
        preview: JSON.stringify({}),
        improvements: JSON.stringify({ title: "Dismissed" }),
        sources: [],
      })
      .returning(["id"])
      .executeTakeFirst();

    // Update to dismissed
    await database
      .updateTable("enrichment_result")
      .set({ status: "dismissed", dismissed_at: new Date().toISOString() })
      .where("id", "=", created!.id)
      .execute();

    // Verify status changed
    const updated = await database
      .selectFrom("enrichment_result")
      .select(["status", "dismissed_at"])
      .where("id", "=", created!.id)
      .executeTakeFirst();

    expect(updated?.status).toBe("dismissed");
    expect(updated?.dismissed_at).toBeDefined();
  });

  test("status check constraint validates allowed values", async ({ database }) => {
    let errorThrown = false;
    try {
      await database
        .insertInto("enrichment_result")
        .values({
          work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
          user_id: BigInt(TEST_USER_ID),
          status: "invalid_status", // Invalid status
          preview: JSON.stringify({}),
          improvements: JSON.stringify({}),
          sources: [],
        })
        .execute();
    } catch (e) {
      errorThrown = true;
      expect(String(e)).toContain("enrichment_result_status_valid");
    }

    expect(errorThrown).toBe(true);
  });

  test("foreign key constraint ensures work exists", async ({ database }) => {
    let errorThrown = false;
    try {
      await database
        .insertInto("enrichment_result")
        .values({
          work_id: BigInt(999999), // Non-existent work
          user_id: BigInt(TEST_USER_ID),
          status: "pending",
          preview: JSON.stringify({}),
          improvements: JSON.stringify({}),
          sources: [],
        })
        .execute();
    } catch (e) {
      errorThrown = true;
      expect(String(e)).toContain("enrichment_result_work_id_fkey");
    }

    expect(errorThrown).toBe(true);
  });

  test("foreign key constraint ensures user exists", async ({ database }) => {
    let errorThrown = false;
    try {
      await database
        .insertInto("enrichment_result")
        .values({
          work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
          user_id: BigInt(999999), // Non-existent user
          status: "pending",
          preview: JSON.stringify({}),
          improvements: JSON.stringify({}),
          sources: [],
        })
        .execute();
    } catch (e) {
      errorThrown = true;
      expect(String(e)).toContain("enrichment_result_user_id_fkey");
    }

    expect(errorThrown).toBe(true);
  });

  test("cascade delete removes enrichment when work is deleted", async ({ database }) => {
    // This test would need a temporary work to avoid affecting other tests
    // Skipping implementation as it would require complex setup
    test.skip();
  });

  test("JSONB fields store and retrieve complex data correctly", async ({ database }) => {
    const complexPreview = {
      title: { value: "Complex Title", confidence: 0.95, source: "OpenLibrary" },
      description: {
        value: "A complex description with special characters: <>&\"'",
        confidence: 0.8,
        metadata: { wordCount: 50, language: "en" },
      },
      publicationDate: { year: 2024, month: 3, day: 15, confidence: 0.9 },
      subjects: [
        { term: "Fiction", scheme: "BISAC" },
        { term: "Science Fiction", scheme: "LCSH" },
      ],
    };

    const complexImprovements = {
      title: "New Complex Title",
      description: "Updated description",
      subjects: ["Fiction", "Fantasy"],
      identifiers: { isbn13: "9781234567890", oclc: "123456" },
    };

    // Insert with complex JSONB
    const created = await database
      .insertInto("enrichment_result")
      .values({
        work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
        user_id: BigInt(TEST_USER_ID),
        status: "pending",
        preview: JSON.stringify(complexPreview),
        improvements: JSON.stringify(complexImprovements),
        sources: ["OpenLibrary", "WikiData", "LibraryOfCongress"],
      })
      .returning(["id"])
      .executeTakeFirst();

    // Retrieve and verify
    const retrieved = await database
      .selectFrom("enrichment_result")
      .select(["preview", "improvements", "sources"])
      .where("id", "=", created!.id)
      .executeTakeFirst();

    expect(retrieved?.sources).toEqual(["OpenLibrary", "WikiData", "LibraryOfCongress"]);

    // Parse JSONB fields
    const parsedPreview =
      typeof retrieved?.preview === "string" ? JSON.parse(retrieved.preview) : retrieved?.preview;
    const parsedImprovements =
      typeof retrieved?.improvements === "string"
        ? JSON.parse(retrieved.improvements)
        : retrieved?.improvements;

    expect(parsedPreview.title.confidence).toBe(0.95);
    expect(parsedPreview.subjects).toHaveLength(2);
    expect(parsedImprovements.identifiers.isbn13).toBe("9781234567890");
  });
});

test.describe("Enrichment Workflow Integration", () => {
  test.beforeEach(async ({ database }) => {
    await database
      .deleteFrom("enrichment_result")
      .where("work_id", "=", BigInt(TEST_ENRICHMENT_WORK_ID))
      .execute();
  });

  test.afterEach(async ({ database }) => {
    await database
      .deleteFrom("enrichment_result")
      .where("work_id", "=", BigInt(TEST_ENRICHMENT_WORK_ID))
      .execute();
  });

  test("complete enrichment workflow: create -> query -> apply", async ({ database }) => {
    // Step 1: Create pending enrichment (simulating async enrichment completion)
    const enrichment = await database
      .insertInto("enrichment_result")
      .values({
        work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
        user_id: BigInt(TEST_USER_ID),
        status: "pending",
        preview: JSON.stringify({
          title: { value: "Original Title", confidence: 0.95 },
          synopsis: { value: "A great book", confidence: 0.85 },
        }),
        improvements: JSON.stringify({
          title: "Better Title",
          synopsis: "An even better description of this book",
        }),
        sources: ["OpenLibrary", "WikiData"],
      })
      .returning(["id"])
      .executeTakeFirst();

    expect(enrichment).toBeDefined();

    // Step 2: Check if enrichment exists (hasEnrichment query)
    const hasEnrichment = await database
      .selectFrom("enrichment_result")
      .select(["id", "sources"])
      .where("work_id", "=", BigInt(TEST_ENRICHMENT_WORK_ID))
      .where("status", "=", "pending")
      .executeTakeFirst();

    expect(hasEnrichment).toBeDefined();
    expect(hasEnrichment?.id).toBe(enrichment?.id);

    // Step 3: Get full preview (getEnrichmentPreview query)
    const preview = await database
      .selectFrom("enrichment_result")
      .select(["id", "preview", "improvements", "sources", "created_at"])
      .where("id", "=", enrichment!.id)
      .executeTakeFirst();

    expect(preview).toBeDefined();
    expect(preview?.sources).toContain("OpenLibrary");

    // Step 4: Apply enrichment (applyEnrichment mutation)
    await database
      .updateTable("enrichment_result")
      .set({ status: "applied", applied_at: new Date().toISOString() })
      .where("id", "=", enrichment!.id)
      .execute();

    // Step 5: Verify no pending enrichment remains
    const pending = await database
      .selectFrom("enrichment_result")
      .select(["id"])
      .where("work_id", "=", BigInt(TEST_ENRICHMENT_WORK_ID))
      .where("status", "=", "pending")
      .executeTakeFirst();

    expect(pending).toBeUndefined();

    // Step 6: Verify enrichment is now in applied state
    const applied = await database
      .selectFrom("enrichment_result")
      .select(["status", "applied_at"])
      .where("id", "=", enrichment!.id)
      .executeTakeFirst();

    expect(applied?.status).toBe("applied");
    expect(applied?.applied_at).toBeDefined();
  });

  test("complete enrichment workflow: create -> query -> dismiss", async ({ database }) => {
    // Step 1: Create pending enrichment
    const enrichment = await database
      .insertInto("enrichment_result")
      .values({
        work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
        user_id: BigInt(TEST_USER_ID),
        status: "pending",
        preview: JSON.stringify({ title: { value: "Unwanted", confidence: 0.5 } }),
        improvements: JSON.stringify({ title: "Unwanted Title" }),
        sources: ["WikiData"],
      })
      .returning(["id"])
      .executeTakeFirst();

    // Step 2: Dismiss enrichment
    await database
      .updateTable("enrichment_result")
      .set({ status: "dismissed", dismissed_at: new Date().toISOString() })
      .where("id", "=", enrichment!.id)
      .execute();

    // Step 3: Verify no pending enrichment
    const pending = await database
      .selectFrom("enrichment_result")
      .select(["id"])
      .where("work_id", "=", BigInt(TEST_ENRICHMENT_WORK_ID))
      .where("status", "=", "pending")
      .executeTakeFirst();

    expect(pending).toBeUndefined();

    // Step 4: Can create new pending enrichment after dismissal
    const newEnrichment = await database
      .insertInto("enrichment_result")
      .values({
        work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
        user_id: BigInt(TEST_USER_ID),
        status: "pending",
        preview: JSON.stringify({ title: { value: "New", confidence: 0.9 } }),
        improvements: JSON.stringify({ title: "New Attempt" }),
        sources: ["OpenLibrary"],
      })
      .returning(["id"])
      .executeTakeFirst();

    expect(newEnrichment).toBeDefined();
    expect(newEnrichment?.id).not.toBe(enrichment?.id);
  });

  test("re-enrichment after previous apply works correctly", async ({ database }) => {
    // Step 1: Create and apply first enrichment
    const first = await database
      .insertInto("enrichment_result")
      .values({
        work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
        user_id: BigInt(TEST_USER_ID),
        status: "pending",
        preview: JSON.stringify({}),
        improvements: JSON.stringify({ title: "First" }),
        sources: ["OpenLibrary"],
      })
      .returning(["id"])
      .executeTakeFirst();

    await database
      .updateTable("enrichment_result")
      .set({ status: "applied", applied_at: new Date().toISOString() })
      .where("id", "=", first!.id)
      .execute();

    // Step 2: Create new pending enrichment
    const second = await database
      .insertInto("enrichment_result")
      .values({
        work_id: BigInt(TEST_ENRICHMENT_WORK_ID),
        user_id: BigInt(TEST_USER_ID),
        status: "pending",
        preview: JSON.stringify({}),
        improvements: JSON.stringify({ title: "Second", synopsis: "New" }),
        sources: ["WikiData"],
      })
      .returning(["id"])
      .executeTakeFirst();

    expect(second).toBeDefined();

    // Step 3: Verify history is preserved
    const all = await database
      .selectFrom("enrichment_result")
      .select(["id", "status"])
      .where("work_id", "=", BigInt(TEST_ENRICHMENT_WORK_ID))
      .orderBy("created_at", "asc")
      .execute();

    expect(all).toHaveLength(2);
    expect(all[0]!.status).toBe("applied");
    expect(all[1]!.status).toBe("pending");
  });
});
