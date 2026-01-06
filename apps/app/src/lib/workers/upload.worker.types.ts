/**
 * Type definitions for the upload worker.
 *
 * IMPORTANT: This file must NOT import any runtime code to avoid pulling in
 * Node.js dependencies like `pg` into the client bundle.
 *
 * Types are defined inline here rather than imported from SDK packages because
 * even type-only imports cause Vite to process the source module.
 */

import type { WorkerMessage } from "$lib/workers/workers";

// Re-define DuplicateCheckResult inline to avoid importing from SDK
// This must match the type in @colibri-hq/sdk/ingestion
export type DuplicateType =
  | "exact-asset"
  | "same-isbn"
  | "same-asin"
  | "similar-title"
  | "different-format";

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  type?: DuplicateType | undefined;
  existingWork?: { id: string; main_edition_id?: string | null } | undefined;
  existingEdition?: { id: string; work_id: string; title: string } | undefined;
  existingAsset?: { id: string; edition_id: string } | undefined;
  confidence: number;
  description?: string | undefined;
}

// Upload request types
export type UploadPayload = {
  files: { id: string; name: string; buffer: ArrayBuffer }[];
};
export type UploadRequest = WorkerMessage<"upload", UploadPayload>;

export type ResumePayload = {
  ids: string[];
};
export type ResumeRequest = WorkerMessage<"resume", ResumePayload>;

export type CancelPayload = {
  id?: string;
};
export type CancelUploadRequest = WorkerMessage<"cancel", CancelPayload>;

// Upload response types
export type UploadStatus = "uploading" | "processing" | "ingesting";

type UploadResponsePayload =
  | {
      id: string;
      name: string;
      failed: true;
      error: string;
    }
  | {
      id: string;
      name: string;
      failed: false;
      duplicate: true;
    }
  | {
      id: string;
      name: string;
      failed: false;
      status: UploadStatus;
    };
export type UploadResponse = WorkerMessage<"upload", UploadResponsePayload>;
