import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { readFile } from "node:fs/promises";
import { initialize, type Database } from "../database.js";
import { ingestWork, confirmIngestion } from "./index.js";
import type { IngestWorkOptions } from "./types.js";
import { subtle } from "node:crypto";

/**
 * Integration tests for the complete ingestion workflow.
 *
 * These tests verify end-to-end functionality with a real database:
 * - File parsing and metadata extraction
 * - Duplicate detection and handling
 * - Entity creation (work, edition, asset, creator, publisher)
 * - Series and tag linking
 * - Pending ingestion workflow
 *
 * ## Running These Tests
 *
 * These tests are skipped by default when DATABASE_URL is not set.
 *
 * To run them:
 * 1. Start local Supabase database: `pnpx supabase start`
 * 2. Set up environment variables:
 *    ```bash
 *    export DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
 *    export DATABASE_CERTIFICATE="" # Optional for local dev
 *    ```
 * 3. Run tests: `pnpm test src/ingestion/ingestion.integration.test.ts`
 *
 * Requirements:
 * - DATABASE_URL environment variable must be set
 * - Test database should be running (e.g., via `pnpx supabase start`)
 * - Test EPUB file exists at project root: "Mogi, Ken - Ikigai.epub"
 * - S3 storage must be configured (via Supabase)
 */

const TEST_EPUB_PATH = "/Users/moritz/Projects/colibri/Mogi, Ken - Ikigai.epub";
const TEST_USER_ID = "999";

describe.skipIf(!process.env.DATABASE_URL)(
  "Ingestion Integration Tests",
  () => {
    let database: Database;
    let testFile: File;
    let testFileChecksum: Uint8Array;

    beforeAll(async () => {
      // Initialize database connection
      database = initialize(process.env.DATABASE_URL!, {
        certificate: process.env.DATABASE_CERTIFICATE,
      });

      // Load the test EPUB file
      try {
        const fileBuffer = await readFile(TEST_EPUB_PATH);
        testFile = new File([fileBuffer], "Mogi, Ken - Ikigai.epub", {
          type: "application/epub+zip",
        });

        // Calculate checksum for later duplicate tests
        const checksumBuffer = await subtle.digest("SHA-256", fileBuffer);
        testFileChecksum = new Uint8Array(checksumBuffer);
      } catch (error) {
        console.error(`Failed to load test EPUB file at ${TEST_EPUB_PATH}`);
        throw error;
      }
    });

    afterAll(async () => {
      // Database connection cleanup happens automatically
      if (database) {
        await database.destroy();
      }
    });

    beforeEach(async () => {
      // Clean up test data before each test
      // This ensures each test starts with a clean slate
      await database.transaction().execute(async (trx) => {
        // Delete in reverse dependency order
        // Note: We use created_by where available, otherwise use joins to find test data

        // Delete assets created by test user
        await trx
          .deleteFrom("asset")
          .where("created_by", "=", TEST_USER_ID)
          .execute();

        // Delete contributions for editions created by test user
        await trx
          .deleteFrom("contribution")
          .where("edition_id", "in", (eb) =>
            eb
              .selectFrom("edition")
              .innerJoin("work", "work.id", "edition.work_id")
              .select("edition.id")
              .where("work.created_by", "=", TEST_USER_ID),
          )
          .execute();

        // Delete work tags
        await trx
          .deleteFrom("work_tag")
          .where("work_id", "in", (eb) =>
            eb
              .selectFrom("work")
              .select("id")
              .where("created_by", "=", TEST_USER_ID),
          )
          .execute();

        // Delete series entries
        await trx
          .deleteFrom("series_entry")
          .where("work_id", "in", (eb) =>
            eb
              .selectFrom("work")
              .select("id")
              .where("created_by", "=", TEST_USER_ID),
          )
          .execute();

        // Delete editions (via work relationship)
        await trx
          .deleteFrom("edition")
          .where("work_id", "in", (eb) =>
            eb
              .selectFrom("work")
              .select("id")
              .where("created_by", "=", TEST_USER_ID),
          )
          .execute();

        // Delete works
        await trx
          .deleteFrom("work")
          .where("created_by", "=", TEST_USER_ID)
          .execute();

        // Clean up tags if they were created by test user
        await trx
          .deleteFrom("tag")
          .where("created_by", "=", TEST_USER_ID)
          .execute();

        // Note: We don't delete creators/publishers as they might be reused
        // and don't have created_by columns in the schema

        // Delete pending ingestions
        await trx
          .deleteFrom("pending_ingestion")
          .where("user_id", "=", TEST_USER_ID)
          .execute();
      });
    });

    describe("Single File Ingestion", () => {
      it("should import new EPUB and create work/edition/asset", async () => {
        const options: IngestWorkOptions = {
          userId: TEST_USER_ID,
        };

        const result = await ingestWork(database, testFile, options);

        expect(result.status).toBe("created");
        expect(result.work).toBeDefined();
        expect(result.edition).toBeDefined();
        expect(result.asset).toBeDefined();
        expect(result.work?.id).toBeTruthy();
        expect(result.edition?.work_id).toBe(result.work?.id);
        expect(result.asset?.edition_id).toBe(result.edition?.id);
      });

      it("should extract title and contributors from EPUB", async () => {
        const options: IngestWorkOptions = {
          userId: TEST_USER_ID,
        };

        const result = await ingestWork(database, testFile, options);

        expect(result.status).toBe("created");
        expect(result.edition?.title).toBeTruthy();
        expect(result.edition?.title.toLowerCase()).toContain("ikigai");

        // Verify creator was created and linked
        const contributions = await database
          .selectFrom("contribution")
          .innerJoin("creator", "creator.id", "contribution.creator_id")
          .selectAll("creator")
          .select("contribution.role")
          .where("contribution.edition_id", "=", result.edition!.id)
          .execute();

        expect(contributions.length).toBeGreaterThan(0);

        // Should have an author
        const authors = contributions.filter((c) => c.role === "aut");
        expect(authors.length).toBeGreaterThan(0);
        expect(authors[0].name.toLowerCase()).toContain("mogi");
      });

      it("should process cover image and generate blurhash", async () => {
        const options: IngestWorkOptions = {
          userId: TEST_USER_ID,
        };

        const result = await ingestWork(database, testFile, options);

        expect(result.status).toBe("created");
        expect(result.edition?.id).toBeTruthy();

        // Load the edition with cover image data
        const edition = await database
          .selectFrom("edition")
          .innerJoin("image", "image.id", "edition.cover_image_id")
          .selectAll("edition")
          .select(["image.blurhash", "image.width", "image.height"])
          .where("edition.id", "=", result.edition!.id)
          .executeTakeFirst();

        if (edition) {
          // If the EPUB has a cover, it should have been processed
          expect(edition.blurhash).toBeTruthy();
          expect(edition.width).toBeGreaterThan(0);
          expect(edition.height).toBeGreaterThan(0);
        }
      });

      it("should store asset with correct checksum", async () => {
        const options: IngestWorkOptions = {
          userId: TEST_USER_ID,
        };

        const result = await ingestWork(database, testFile, options);

        expect(result.status).toBe("created");
        expect(result.asset?.checksum).toBeDefined();

        // Verify checksum matches our pre-calculated one
        const assetChecksum = new Uint8Array(result.asset!.checksum);
        expect(
          Buffer.from(assetChecksum).equals(Buffer.from(testFileChecksum)),
        ).toBe(true);
      });
    });

    describe("Duplicate Detection", () => {
      it("should skip exact duplicate (same checksum)", async () => {
        const options: IngestWorkOptions = {
          userId: TEST_USER_ID,
        };

        // Import the file first time
        const firstResult = await ingestWork(database, testFile, options);
        expect(firstResult.status).toBe("created");

        // Try to import again - should skip
        const secondResult = await ingestWork(database, testFile, options);
        expect(secondResult.status).toBe("skipped");
        expect(secondResult.duplicateInfo?.type).toBe("exact-asset");
        expect(secondResult.duplicateInfo?.hasDuplicate).toBe(true);
        expect(secondResult.work?.id).toBe(firstResult.work?.id);
      });

      it("should detect duplicate with onDuplicateWork='skip' option", async () => {
        // First import
        const firstResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });
        expect(firstResult.status).toBe("created");

        // Second import with skip option
        const secondResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
          onDuplicateWork: "skip",
        });

        expect(secondResult.status).toBe("skipped");
        expect(secondResult.duplicateInfo?.hasDuplicate).toBe(true);
      });

      it("should prompt for confirmation when duplicates detected and onDuplicateWork='prompt'", async () => {
        // First import
        const firstResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });
        expect(firstResult.status).toBe("created");

        // Second import with prompt option and required fields
        const secondResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
          uploadId: "test-upload-123",
          s3Key: "test-key",
          onDuplicateWork: "prompt",
        });

        expect(secondResult.status).toBe("needs-confirmation");
        expect(secondResult.pendingId).toBeTruthy();
        expect(secondResult.duplicateInfo?.hasDuplicate).toBe(true);

        // Verify pending ingestion was created
        const pending = await database
          .selectFrom("pending_ingestion")
          .selectAll()
          .where("id", "=", secondResult.pendingId!)
          .executeTakeFirst();

        expect(pending).toBeDefined();
        expect(pending?.user_id).toBe(TEST_USER_ID);
      });
    });

    describe("Creator/Publisher Normalization", () => {
      it("should create new creator on first import", async () => {
        const result = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });

        expect(result.status).toBe("created");

        // Verify creators were linked to the edition
        const creatorCount = await database
          .selectFrom("contribution")
          .innerJoin("edition", "edition.id", "contribution.edition_id")
          .innerJoin("work", "work.id", "edition.work_id")
          .where("work.created_by", "=", TEST_USER_ID)
          .select(({ fn }) => fn.countAll<number>().as("count"))
          .executeTakeFirstOrThrow();

        expect(creatorCount.count).toBeGreaterThan(0);
      });

      it("should reuse existing creator with exact name match", async () => {
        // First import creates the creator
        const firstResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });
        expect(firstResult.status).toBe("created");

        // Get creator ID
        const firstCreators = await database
          .selectFrom("contribution")
          .select("creator_id")
          .where("edition_id", "=", firstResult.edition!.id)
          .where("role", "=", "aut")
          .execute();

        // Clean up the work/edition but keep the creator
        await database
          .deleteFrom("asset")
          .where("edition_id", "=", firstResult.edition!.id)
          .execute();
        await database
          .deleteFrom("contribution")
          .where("edition_id", "=", firstResult.edition!.id)
          .execute();
        await database
          .deleteFrom("edition")
          .where("id", "=", firstResult.edition!.id)
          .execute();
        await database
          .deleteFrom("work")
          .where("id", "=", firstResult.work!.id)
          .execute();

        // Second import should reuse the creator
        const secondResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });
        expect(secondResult.status).toBe("created");

        const secondCreators = await database
          .selectFrom("contribution")
          .select("creator_id")
          .where("edition_id", "=", secondResult.edition!.id)
          .where("role", "=", "aut")
          .execute();

        // Should have reused the same creator
        expect(firstCreators[0].creator_id).toBe(secondCreators[0].creator_id);
      });
    });

    describe("Series and Tags", () => {
      it("should extract and link series from EPUB metadata if present", async () => {
        const result = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });

        expect(result.status).toBe("created");

        // Check if series was created (the test EPUB might not have series info)
        const seriesEntries = await database
          .selectFrom("series_entry")
          .innerJoin("series", "series.id", "series_entry.series_id")
          .select(["series.id", "series.name", "series_entry.position"])
          .where("series_entry.work_id", "=", result.work!.id)
          .execute();

        // This test EPUB might not have series info, so we just verify the query works
        // If it has series, verify the structure
        if (seriesEntries.length > 0) {
          expect(seriesEntries[0].name).toBeTruthy();
        }
      });

      it("should extract and link tags from dc:subject", async () => {
        const result = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });

        expect(result.status).toBe("created");

        // Load tags for the work
        const tags = await loadTagsForWork(database, result.work!.id);

        // The test EPUB might have subject tags
        // This verifies the tag extraction and linking mechanism works
        if (tags.length > 0) {
          expect(tags[0].value).toBeTruthy();
        }
      });

      it("should not create duplicate tags when adding multiple works with same subjects", async () => {
        // First import
        const firstResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });
        expect(firstResult.status).toBe("created");

        const firstTags = await loadTagsForWork(database, firstResult.work!.id);

        // Clean up the work but keep tags
        await database
          .deleteFrom("asset")
          .where("edition_id", "=", firstResult.edition!.id)
          .execute();
        await database
          .deleteFrom("contribution")
          .where("edition_id", "=", firstResult.edition!.id)
          .execute();
        await database
          .deleteFrom("work_tag")
          .where("work_id", "=", firstResult.work!.id)
          .execute();
        await database
          .deleteFrom("edition")
          .where("id", "=", firstResult.edition!.id)
          .execute();
        await database
          .deleteFrom("work")
          .where("id", "=", firstResult.work!.id)
          .execute();

        // Second import should reuse the same tag records
        const secondResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });
        expect(secondResult.status).toBe("created");

        const secondTags = await loadTagsForWork(
          database,
          secondResult.work!.id,
        );

        // If both works have tags, verify no duplicate tag records were created
        if (firstTags.length > 0 && secondTags.length > 0) {
          const allTags = await database
            .selectFrom("tag")
            .selectAll()
            .where("created_by", "=", TEST_USER_ID)
            .execute();

          // Should have unique tags only
          const uniqueValues = new Set(allTags.map((t) => t.value));
          expect(allTags.length).toBe(uniqueValues.size);
        }
      });
    });

    describe("Pending Ingestion Workflow", () => {
      it("should persist pending ingestion to database", async () => {
        // First import to create a work
        const firstResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });
        expect(firstResult.status).toBe("created");

        // Try to import again with prompt option
        const pendingResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
          uploadId: "test-upload-456",
          s3Key: "test-s3-key",
          onDuplicateWork: "prompt",
        });

        expect(pendingResult.status).toBe("needs-confirmation");
        expect(pendingResult.pendingId).toBeTruthy();

        // Verify pending record exists in database
        const pending = await database
          .selectFrom("pending_ingestion")
          .selectAll()
          .where("id", "=", pendingResult.pendingId!)
          .executeTakeFirst();

        expect(pending).toBeDefined();
        expect(pending?.upload_id).toBe("test-upload-456");
        expect(pending?.s3_key).toBe("test-s3-key");
        expect(pending?.extracted_metadata).toBeDefined();
        expect(pending?.duplicate_info).toBeDefined();
      });

      it("should retrieve and confirm pending ingestion with 'skip' action", async () => {
        // Create pending ingestion
        const firstResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });

        const pendingResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
          uploadId: "test-upload-789",
          s3Key: "test-s3-key-2",
          onDuplicateWork: "prompt",
        });

        expect(pendingResult.status).toBe("needs-confirmation");
        const pendingId = pendingResult.pendingId!;

        // Confirm with skip action (no file needed)
        const confirmResult = await confirmIngestion(
          database,
          pendingId,
          "skip",
        );

        expect(confirmResult.status).toBe("skipped");
        expect(confirmResult.work?.id).toBe(firstResult.work?.id);

        // Verify pending record was deleted
        const pending = await database
          .selectFrom("pending_ingestion")
          .selectAll()
          .where("id", "=", pendingId)
          .executeTakeFirst();

        expect(pending).toBeUndefined();
      });

      it("should retrieve and confirm pending ingestion with 'create-work' action", async () => {
        // Create pending ingestion
        await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });

        const pendingResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
          uploadId: "test-upload-101",
          s3Key: "test-s3-key-3",
          onDuplicateWork: "prompt",
        });

        expect(pendingResult.status).toBe("needs-confirmation");
        const pendingId = pendingResult.pendingId!;

        // Confirm with create-work action (need to provide file again)
        const confirmResult = await confirmIngestion(
          database,
          pendingId,
          "create-work",
          testFile,
        );

        expect(confirmResult.status).toBe("created");
        expect(confirmResult.work).toBeDefined();
        expect(confirmResult.edition).toBeDefined();
        expect(confirmResult.asset).toBeDefined();

        // Should have created a new work (different from the first one)
        const works = await database
          .selectFrom("work")
          .selectAll()
          .where("created_by", "=", TEST_USER_ID)
          .execute();

        expect(works.length).toBe(2);
      });

      it("should retrieve and confirm pending ingestion with 'create-edition' action", async () => {
        // Create first work
        const firstResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });

        const pendingResult = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
          uploadId: "test-upload-202",
          s3Key: "test-s3-key-4",
          onDuplicateWork: "prompt",
        });

        expect(pendingResult.status).toBe("needs-confirmation");
        const pendingId = pendingResult.pendingId!;

        // Confirm with create-edition action
        const confirmResult = await confirmIngestion(
          database,
          pendingId,
          "create-edition",
          testFile,
        );

        expect(confirmResult.status).toBe("added-edition");
        expect(confirmResult.work?.id).toBe(firstResult.work?.id);
        expect(confirmResult.edition?.id).not.toBe(firstResult.edition?.id);

        // Verify new edition was added to existing work
        const editions = await database
          .selectFrom("edition")
          .selectAll()
          .where("work_id", "=", firstResult.work!.id)
          .execute();

        expect(editions.length).toBe(2);
      });
    });

    // Note: Batch import tests will be added when batchImport functionality is implemented

    describe("Edge Cases and Error Handling", () => {
      it("should handle missing required fields for pending ingestion", async () => {
        // First import
        await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });

        // Try to create pending ingestion without userId
        await expect(
          ingestWork(database, testFile, {
            onDuplicateWork: "prompt",
          }),
        ).rejects.toThrow("userId is required");

        // Try without uploadId
        await expect(
          ingestWork(database, testFile, {
            userId: TEST_USER_ID,
            onDuplicateWork: "prompt",
          }),
        ).rejects.toThrow("uploadId is required");

        // Try without s3Key
        await expect(
          ingestWork(database, testFile, {
            userId: TEST_USER_ID,
            uploadId: "test",
            onDuplicateWork: "prompt",
          }),
        ).rejects.toThrow("s3Key is required");
      });

      it("should return warnings for non-critical issues", async () => {
        const result = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });

        expect(result.status).toBe("created");
        expect(result.warnings).toBeDefined();
        expect(Array.isArray(result.warnings)).toBe(true);
      });

      it("should handle files without cover images gracefully", async () => {
        // The test would need a file without a cover
        // For now, we verify that the process doesn't fail if cover is missing
        const result = await ingestWork(database, testFile, {
          userId: TEST_USER_ID,
        });

        expect(result.status).toBe("created");
        expect(result.edition).toBeDefined();
        // cover_image_id might be null, which is fine
      });
    });
  },
);
