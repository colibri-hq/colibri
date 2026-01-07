import { z } from "zod";

export const databaseDsnSchema = z.string().refine(
  (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "postgres:" || url.protocol === "postgresql:";
    } catch {
      return false;
    }
  },
  { message: "Must be a valid PostgreSQL connection string (postgres://...)" },
);

export const emailSchema = z.string().email("Invalid email address");

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name too long");

export const instanceNameSchema = z
  .string()
  .min(1, "Instance name is required")
  .max(100, "Instance name too long");

export const storageEndpointSchema = z.string().refine(
  (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  },
  { message: "Must be a valid HTTP(S) URL" },
);

export const smtpPortSchema = z.coerce.number().int().min(1).max(65_535);

export const smtpHostSchema = z.string().min(1, "SMTP host is required");

/**
 * Validate database DSN format
 */
export function validateDatabaseDsn(dsn: string): string | undefined {
  const result = databaseDsnSchema.safeParse(dsn);
  return result.success ? undefined : result.error.issues[0]?.message;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | undefined {
  const result = emailSchema.safeParse(email);
  return result.success ? undefined : result.error.issues[0]?.message;
}

/**
 * Validate storage endpoint URL
 */
export function validateStorageEndpoint(endpoint: string): string | undefined {
  const result = storageEndpointSchema.safeParse(endpoint);
  return result.success ? undefined : result.error.issues[0]?.message;
}
