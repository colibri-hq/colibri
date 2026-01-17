import { describe, it, expect, beforeEach } from "vitest";
import type { ExtractedMetadata, DuplicateCheckResult } from "../ingestion/types.js";
import { initialize } from "../database.js";
import {
  createPendingIngestion,
  getPendingIngestion,
  deletePendingIngestion,
  deleteExpiredIngestions,
  getPendingIngestionsForUser,
} from "./pending-ingestion.js";

describe("Pending Ingestion Resource", () => {
  const database = initialize(
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54322/postgres",
  );

  const mockMetadata: ExtractedMetadata = {
    title: "Test Book",
    contributors: [{ name: "Test Author", roles: ["aut"] }],
    identifiers: [{ type: "isbn", value: "978-0-123456-78-9" }],
  };

  const mockDuplicateInfo: DuplicateCheckResult = {
    hasDuplicate: true,
    type: "similar-title",
    confidence: 0.85,
    description: "Found similar book",
  };

  // SHA-256 produces 32 bytes (64 hex characters)
  const mockChecksum = new Uint8Array(32).fill(0xab);

  let testUserId: string;

  beforeEach(async () => {
    // Clean up any existing test data
    await database.deleteFrom("pending_ingestion").where("upload_id", "like", "test-%").execute();

    // Create or reuse a test user for foreign key constraint
    let user = await database
      .selectFrom("authentication.user")
      .selectAll()
      .where("email", "=", "test-pending-ingestion@example.com")
      .executeTakeFirst();

    if (!user) {
      user = await database
        .insertInto("authentication.user")
        .values({ email: "test-pending-ingestion@example.com", name: "Test User", role: "adult" })
        .returningAll()
        .executeTakeFirst();
    }

    testUserId = user?.id.toString() ?? "1";
  });

  describe("createPendingIngestion", () => {
    it("should create a pending ingestion record", async () => {
      const result = await createPendingIngestion(database, {
        userId: testUserId,
        uploadId: "test-upload-123",
        s3Key: "uploads/test-file.epub",
        checksum: mockChecksum,
        extractedMetadata: mockMetadata,
        duplicateInfo: mockDuplicateInfo,
      });

      expect(result.id).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.uploadId).toBe("test-upload-123");
      expect(result.s3Key).toBe("uploads/test-file.epub");
      expect(result.checksum).toEqual(mockChecksum);
      expect(result.extractedMetadata).toEqual(mockMetadata);
      expect(result.duplicateInfo).toEqual(mockDuplicateInfo);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it("should properly serialize complex metadata", async () => {
      const complexMetadata: ExtractedMetadata = {
        ...mockMetadata,
        synopsis: "A detailed synopsis with\nline breaks and special chars: <>&",
        properties: { custom: "value", nested: { deep: true } },
      };

      const result = await createPendingIngestion(database, {
        userId: testUserId,
        uploadId: "test-upload-complex",
        s3Key: "uploads/complex.epub",
        checksum: mockChecksum,
        extractedMetadata: complexMetadata,
        duplicateInfo: mockDuplicateInfo,
      });

      expect(result.extractedMetadata.synopsis).toBe(complexMetadata.synopsis);
      expect(result.extractedMetadata.properties).toEqual(complexMetadata.properties);
    });
  });

  describe("getPendingIngestion", () => {
    it("should retrieve a pending ingestion by ID", async () => {
      const created = await createPendingIngestion(database, {
        userId: testUserId,
        uploadId: "test-upload-retrieve",
        s3Key: "uploads/retrieve.epub",
        checksum: mockChecksum,
        extractedMetadata: mockMetadata,
        duplicateInfo: mockDuplicateInfo,
      });

      const retrieved = await getPendingIngestion(database, created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.userId).toBe(testUserId);
      expect(retrieved?.extractedMetadata).toEqual(mockMetadata);
    });

    it("should return undefined for non-existent ID", async () => {
      const result = await getPendingIngestion(database, "00000000-0000-0000-0000-000000000000");
      expect(result).toBeUndefined();
    });
  });

  describe("deletePendingIngestion", () => {
    it("should delete a pending ingestion by ID", async () => {
      const created = await createPendingIngestion(database, {
        userId: testUserId,
        uploadId: "test-upload-delete",
        s3Key: "uploads/delete.epub",
        checksum: mockChecksum,
        extractedMetadata: mockMetadata,
        duplicateInfo: mockDuplicateInfo,
      });

      const deleted = await deletePendingIngestion(database, created.id);
      expect(deleted).toBe(true);

      const retrieved = await getPendingIngestion(database, created.id);
      expect(retrieved).toBeUndefined();
    });

    it("should return false when deleting non-existent record", async () => {
      const deleted = await deletePendingIngestion(
        database,
        "00000000-0000-0000-0000-000000000000",
      );
      expect(deleted).toBe(false);
    });
  });

  describe("getPendingIngestionsForUser", () => {
    it("should retrieve all pending ingestions for a user", async () => {
      await createPendingIngestion(database, {
        userId: testUserId,
        uploadId: "test-upload-user-1",
        s3Key: "uploads/user1.epub",
        checksum: mockChecksum,
        extractedMetadata: mockMetadata,
        duplicateInfo: mockDuplicateInfo,
      });

      await createPendingIngestion(database, {
        userId: testUserId,
        uploadId: "test-upload-user-2",
        s3Key: "uploads/user2.epub",
        checksum: mockChecksum,
        extractedMetadata: mockMetadata,
        duplicateInfo: mockDuplicateInfo,
      });

      const results = await getPendingIngestionsForUser(database, testUserId);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.userId === testUserId)).toBe(true);
      expect(results[0].createdAt.getTime()).toBeGreaterThanOrEqual(results[1].createdAt.getTime());
    });

    it("should return empty array for user with no pending ingestions", async () => {
      const results = await getPendingIngestionsForUser(database, "999");
      expect(results).toEqual([]);
    });

    it("should not return expired ingestions", async () => {
      // Create an expired record by manually setting expires_at
      const created = await createPendingIngestion(database, {
        userId: testUserId,
        uploadId: "test-upload-expired",
        s3Key: "uploads/expired.epub",
        checksum: mockChecksum,
        extractedMetadata: mockMetadata,
        duplicateInfo: mockDuplicateInfo,
      });

      // Manually set expires_at to the past
      await database
        .updateTable("pending_ingestion")
        .set({ expires_at: new Date(Date.now() - 1000) })
        .where("id", "=", created.id)
        .execute();

      const results = await getPendingIngestionsForUser(database, testUserId);
      expect(results).toEqual([]);
    });
  });

  describe("deleteExpiredIngestions", () => {
    it("should delete expired ingestion records", async () => {
      const valid = await createPendingIngestion(database, {
        userId: testUserId,
        uploadId: "test-upload-valid",
        s3Key: "uploads/valid.epub",
        checksum: mockChecksum,
        extractedMetadata: mockMetadata,
        duplicateInfo: mockDuplicateInfo,
      });

      const expired = await createPendingIngestion(database, {
        userId: testUserId,
        uploadId: "test-upload-expired-cleanup",
        s3Key: "uploads/expired-cleanup.epub",
        checksum: mockChecksum,
        extractedMetadata: mockMetadata,
        duplicateInfo: mockDuplicateInfo,
      });

      // Manually set expires_at to the past
      await database
        .updateTable("pending_ingestion")
        .set({ expires_at: new Date(Date.now() - 1000) })
        .where("id", "=", expired.id)
        .execute();

      const deletedCount = await deleteExpiredIngestions(database);
      expect(deletedCount).toBeGreaterThanOrEqual(1);

      const validStillExists = await getPendingIngestion(database, valid.id);
      expect(validStillExists).toBeDefined();

      const expiredGone = await getPendingIngestion(database, expired.id);
      expect(expiredGone).toBeUndefined();
    });

    it("should return 0 when no expired records exist", async () => {
      const deletedCount = await deleteExpiredIngestions(database);
      expect(deletedCount).toBe(0);
    });
  });

  describe("checksum conversion", () => {
    it("should correctly convert checksum between Uint8Array and hex", async () => {
      // Must be 32 bytes (64 hex chars) to pass validation
      const testChecksum = new Uint8Array(32);
      testChecksum[0] = 0;
      testChecksum[1] = 1;
      testChecksum[2] = 15;
      testChecksum[3] = 16;
      testChecksum[31] = 255;

      const created = await createPendingIngestion(database, {
        userId: testUserId,
        uploadId: "test-upload-checksum",
        s3Key: "uploads/checksum.epub",
        checksum: testChecksum,
        extractedMetadata: mockMetadata,
        duplicateInfo: mockDuplicateInfo,
      });

      const retrieved = await getPendingIngestion(database, created.id);
      expect(retrieved?.checksum).toEqual(testChecksum);
    });
  });
});
