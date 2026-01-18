import { describe, expect, it } from "vitest";
import {
  databaseDsnSchema,
  emailSchema,
  instanceNameSchema,
  nameSchema,
  smtpHostSchema,
  smtpPortSchema,
  storageEndpointSchema,
  validateDatabaseDsn,
  validateEmail,
  validateStorageEndpoint,
} from "../src/core/validation.js";

describe("Validation Schemas", () => {
  describe("databaseDsnSchema", () => {
    it("should accept valid postgres:// URLs", () => {
      expect(databaseDsnSchema.safeParse("postgres://user:pass@localhost:5432/db").success).toBe(
        true,
      );
    });

    it("should accept valid postgresql:// URLs", () => {
      expect(databaseDsnSchema.safeParse("postgresql://user:pass@localhost:5432/db").success).toBe(
        true,
      );
    });

    it("should accept URLs with special characters in password", () => {
      expect(
        databaseDsnSchema.safeParse("postgres://user:p%40ss%23word@localhost:5432/db").success,
      ).toBe(true);
    });

    it("should reject mysql:// URLs", () => {
      const result = databaseDsnSchema.safeParse("mysql://user:pass@localhost:3306/db");
      expect(result.success).toBe(false);
    });

    it("should reject http:// URLs", () => {
      const result = databaseDsnSchema.safeParse("http://localhost:5432");
      expect(result.success).toBe(false);
    });

    it("should reject invalid URLs", () => {
      const result = databaseDsnSchema.safeParse("not-a-valid-url");
      expect(result.success).toBe(false);
    });

    it("should reject empty strings", () => {
      const result = databaseDsnSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should provide meaningful error message", () => {
      const result = databaseDsnSchema.safeParse("invalid");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("PostgreSQL connection string");
      }
    });
  });

  describe("emailSchema", () => {
    it("should accept valid email addresses", () => {
      expect(emailSchema.safeParse("user@example.com").success).toBe(true);
      expect(emailSchema.safeParse("user.name@example.co.uk").success).toBe(true);
      expect(emailSchema.safeParse("user+tag@example.com").success).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(emailSchema.safeParse("not-an-email").success).toBe(false);
      expect(emailSchema.safeParse("@example.com").success).toBe(false);
      expect(emailSchema.safeParse("user@").success).toBe(false);
      expect(emailSchema.safeParse("").success).toBe(false);
    });

    it("should provide meaningful error message", () => {
      const result = emailSchema.safeParse("invalid");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Invalid email address");
      }
    });
  });

  describe("nameSchema", () => {
    it("should accept valid names", () => {
      expect(nameSchema.safeParse("John Doe").success).toBe(true);
      expect(nameSchema.safeParse("A").success).toBe(true);
      expect(nameSchema.safeParse("A".repeat(100)).success).toBe(true);
    });

    it("should reject empty names", () => {
      const result = nameSchema.safeParse("");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Name is required");
      }
    });

    it("should reject names that are too long", () => {
      const result = nameSchema.safeParse("A".repeat(101));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Name too long");
      }
    });
  });

  describe("instanceNameSchema", () => {
    it("should accept valid instance names", () => {
      expect(instanceNameSchema.safeParse("My Library").success).toBe(true);
      expect(instanceNameSchema.safeParse("A").success).toBe(true);
      expect(instanceNameSchema.safeParse("A".repeat(100)).success).toBe(true);
    });

    it("should reject empty instance names", () => {
      const result = instanceNameSchema.safeParse("");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Instance name is required");
      }
    });

    it("should reject instance names that are too long", () => {
      const result = instanceNameSchema.safeParse("A".repeat(101));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Instance name too long");
      }
    });
  });

  describe("storageEndpointSchema", () => {
    it("should accept valid https:// URLs", () => {
      expect(storageEndpointSchema.safeParse("https://s3.amazonaws.com").success).toBe(true);
      expect(storageEndpointSchema.safeParse("https://storage.example.com:9000").success).toBe(
        true,
      );
    });

    it("should accept valid http:// URLs", () => {
      expect(storageEndpointSchema.safeParse("http://localhost:9000").success).toBe(true);
      expect(storageEndpointSchema.safeParse("http://minio:9000").success).toBe(true);
    });

    it("should reject non-HTTP URLs", () => {
      expect(storageEndpointSchema.safeParse("ftp://files.example.com").success).toBe(false);
      expect(storageEndpointSchema.safeParse("s3://bucket-name").success).toBe(false);
    });

    it("should reject invalid URLs", () => {
      expect(storageEndpointSchema.safeParse("not-a-url").success).toBe(false);
      expect(storageEndpointSchema.safeParse("").success).toBe(false);
    });

    it("should provide meaningful error message", () => {
      const result = storageEndpointSchema.safeParse("invalid");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Must be a valid HTTP(S) URL");
      }
    });
  });

  describe("smtpPortSchema", () => {
    it("should accept valid port numbers", () => {
      expect(smtpPortSchema.safeParse(25).success).toBe(true);
      expect(smtpPortSchema.safeParse(465).success).toBe(true);
      expect(smtpPortSchema.safeParse(587).success).toBe(true);
      expect(smtpPortSchema.safeParse(1).success).toBe(true);
      expect(smtpPortSchema.safeParse(65_535).success).toBe(true);
    });

    it("should coerce string port numbers", () => {
      expect(smtpPortSchema.safeParse("587").success).toBe(true);
      expect(smtpPortSchema.safeParse("25").success).toBe(true);
    });

    it("should reject port 0", () => {
      expect(smtpPortSchema.safeParse(0).success).toBe(false);
    });

    it("should reject ports above 65535", () => {
      expect(smtpPortSchema.safeParse(65_536).success).toBe(false);
      expect(smtpPortSchema.safeParse(100_000).success).toBe(false);
    });

    it("should reject negative ports", () => {
      expect(smtpPortSchema.safeParse(-1).success).toBe(false);
    });

    it("should reject non-integer ports", () => {
      expect(smtpPortSchema.safeParse(587.5).success).toBe(false);
    });
  });

  describe("smtpHostSchema", () => {
    it("should accept valid hostnames", () => {
      expect(smtpHostSchema.safeParse("smtp.gmail.com").success).toBe(true);
      expect(smtpHostSchema.safeParse("mail.example.com").success).toBe(true);
      expect(smtpHostSchema.safeParse("localhost").success).toBe(true);
    });

    it("should reject empty strings", () => {
      const result = smtpHostSchema.safeParse("");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("SMTP host is required");
      }
    });
  });
});

describe("Validation Functions", () => {
  describe("validateDatabaseDsn", () => {
    it("should return undefined for valid DSNs", () => {
      expect(validateDatabaseDsn("postgres://user:pass@localhost:5432/db")).toBeUndefined();
      expect(validateDatabaseDsn("postgresql://user:pass@localhost:5432/db")).toBeUndefined();
    });

    it("should return error message for invalid DSNs", () => {
      expect(validateDatabaseDsn("mysql://user:pass@localhost:3306/db")).toBe(
        "Must be a valid PostgreSQL connection string (postgres://...)",
      );
      expect(validateDatabaseDsn("invalid")).toBe(
        "Must be a valid PostgreSQL connection string (postgres://...)",
      );
    });
  });

  describe("validateEmail", () => {
    it("should return undefined for valid emails", () => {
      expect(validateEmail("user@example.com")).toBeUndefined();
      expect(validateEmail("admin@test.org")).toBeUndefined();
    });

    it("should return error message for invalid emails", () => {
      expect(validateEmail("not-an-email")).toBe("Invalid email address");
      expect(validateEmail("")).toBe("Invalid email address");
    });
  });

  describe("validateStorageEndpoint", () => {
    it("should return undefined for valid endpoints", () => {
      expect(validateStorageEndpoint("https://s3.amazonaws.com")).toBeUndefined();
      expect(validateStorageEndpoint("http://localhost:9000")).toBeUndefined();
    });

    it("should return error message for invalid endpoints", () => {
      expect(validateStorageEndpoint("ftp://files.example.com")).toBe(
        "Must be a valid HTTP(S) URL",
      );
      expect(validateStorageEndpoint("not-a-url")).toBe("Must be a valid HTTP(S) URL");
    });
  });
});
