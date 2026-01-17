import type {
  CancelUploadRequest,
  DuplicateCheckResult,
  ResumeRequest,
  UploadRequest,
  UploadResponse,
} from "$lib/workers/upload.worker.types";
import { browser } from "$app/environment";
import { error as notifyError, warning } from "$lib/notifications";
import { loadWorker, type WebWorker } from "$lib/workers/workers";
import { generateRandomUuid } from "@colibri-hq/shared";
import { derived, get, writable } from "svelte/store";

export const supportedUploadFormats = [
  { description: "EPUB eBook", accept: { "application/epub+zip": ".epub" } },
  {
    description: "PDF Document",
    accept: { "application/pdf": ".pdf", "application/x-pdf": ".pdf" },
  },
  {
    description: "Amazon eBook",
    accept: {
      "application/azw3": ".azw3",
      "application/x-mobi8-ebook": ".azw3",
      "application/vnd.amazon.mobi8-ebook": ".azw3",
    },
  },
  {
    description: "Mobipocket eBook",
    accept: {
      "application/x-mobipocket-ebook": [".mobi", ".prc"],
      "application/octet-stream": [".mobi", ".prc"],
    },
  },
] satisfies FilePickerAcceptType[];

let worker: WebWorker<UploadRequest | ResumeRequest | CancelUploadRequest, UploadResponse> | null =
  null;

export async function upload(items: (File | FileSystemFileHandle)[]) {
  const worker = await loadUploadsWorker();
  const localFiles = await Promise.all(
    items.map(async (handle) => {
      const id = generateRandomUuid();
      const file = await (handle instanceof File ? handle : handle.getFile());

      return { file, id };
    }),
  );

  // region Create jobs for the new files, update queue store
  const jobs = localFiles.map(
    ({ id, file: { type, name, size } }): QueuedUpload => ({
      id,
      name,
      type,
      size,
      status: "pending",
      resumable: true,
    }),
  );

  queue.update((queued) => [...queued, ...jobs]);
  // endregion

  worker.addEventListener("message", ({ data: { payload } }) => {
    if (payload.failed) {
      notifyError("Upload failed", { message: `Failed to upload ${payload.name}` });
    } else if ("duplicate" in payload && payload.duplicate) {
      warning("Duplicate detected", { message: `${payload.name} already exists in your library` });
    }
    // Note: Success notifications are now handled via SSE events
  });

  worker.addEventListener("error", (event) => {
    console.error("Worker failed", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });

    const jobIds = jobs.map(({ id }) => id);
    queue.update((queued) => queued.filter(({ id }) => !jobIds.includes(id)));
  });

  const files = await Promise.all(
    localFiles.map(async ({ id, file }) => ({
      buffer: await file.arrayBuffer(),
      name: file.name,
      id,
    })),
  );

  // Dispatch the upload request to the worker, including the stream as transferable objects. This
  // will transfer ownership of the objects in the system memory to the web worker, which can take
  // care of handling the files.
  worker.postMessage(
    { type: "upload", payload: { files } },
    files.map(({ buffer }) => buffer),
  );
}

export async function resume() {
  const worker = await loadUploadsWorker();
  const ids = get(queue)
    .filter(({ resumable }) => resumable)
    .map(({ id }) => id);

  if (ids.length === 0) {
    return;
  }

  worker.addEventListener("message", ({ data: { type, payload } }) => {
    console.log("Got worker result", { type, payload });
  });

  worker.postMessage({ type: "resume", payload: { ids } });
}

export async function promptForFiles() {
  const files = await showOpenFilePicker({
    multiple: true,
    startIn: "documents",
    types: supportedUploadFormats as unknown as FilePickerAcceptType[],
  });

  return Promise.all(files.map((file) => file.getFile()));
}

async function loadUploadsWorker() {
  if (worker === null) {
    const workerModule = import("$lib/workers/upload.worker?worker");

    worker = await loadWorker<UploadRequest | ResumeRequest | CancelUploadRequest, UploadResponse>(
      workerModule,
    );

    worker.addEventListener("message", ({ data: { payload } }) => {
      queue.update((currentQueue) => {
        return currentQueue
          .map((item) => {
            if (item.id !== payload.id) return item;

            if (payload.failed) {
              return { ...item, status: "failed" as const, error: payload.error };
            }

            if ("duplicate" in payload && payload.duplicate) {
              // Remove from queue - duplicate detected by checksum
              return null;
            }

            if ("status" in payload) {
              // Update status based on worker progress
              return { ...item, status: payload.status as QueuedUploadStatus };
            }

            return item;
          })
          .filter((item): item is QueuedUpload => item !== null);
      });
    });
  }

  return worker;
}

const key = "colibri.uploads.queue";
const initialValue = browser ? deserialize(localStorage.getItem(key) || "[]") : [];

const queue = writable(initialValue);

const exportedQueue = derived(queue, (s) => s);
export { exportedQueue as queue };

/**
 * Derived store for active uploads (not completed or failed)
 */
export const activeUploads = derived(queue, ($queue) =>
  $queue.filter((item) => !["completed", "failed"].includes(item.status)),
);

/**
 * Derived store for upload progress summary
 * Note: `total` excludes failed items so the progress message is accurate
 */
export const uploadProgress = derived(queue, ($queue) => {
  // Exclude failed items from progress calculation - they shouldn't affect the count
  const relevantQueue = $queue.filter((item) => item.status !== "failed");
  const total = relevantQueue.length;
  const completed = relevantQueue.filter((item) => item.status === "completed").length;
  const failed = $queue.filter((item) => item.status === "failed").length;
  const active = relevantQueue.filter(
    (item) => !["completed", "failed", "needs-confirmation"].includes(item.status),
  ).length;
  const needsConfirmation = relevantQueue.filter(
    (item) => item.status === "needs-confirmation",
  ).length;

  return { total, completed, failed, active, needsConfirmation };
});

/**
 * Update queue from SSE import events
 */
export function updateQueueFromSSE(event: {
  type: string;
  uploadId: string;
  pendingId?: string;
  duplicateInfo?: DuplicateCheckResult;
  reason?: string;
  error?: string;
}) {
  queue.update((currentQueue) => {
    return currentQueue
      .map((item) => {
        if (item.id !== event.uploadId) return item;

        switch (event.type) {
          case "completed":
            return { ...item, status: "completed" as const };

          case "duplicate":
            return {
              ...item,
              status: "needs-confirmation" as const,
              pendingId: event.pendingId,
              duplicateInfo: event.duplicateInfo,
            };

          case "skipped":
            // Remove skipped items from queue
            return null;

          case "failed":
            return { ...item, status: "failed" as const, error: event.error };

          default:
            return item;
        }
      })
      .filter((item): item is QueuedUpload => item !== null);
  });
}

/**
 * Remove completed and failed items from the queue
 */
export function clearCompletedUploads() {
  queue.update((currentQueue) =>
    currentQueue.filter((item) => !["completed", "failed"].includes(item.status)),
  );
}

/**
 * Remove a specific item from the queue by ID
 */
export function removeFromQueue(id: string) {
  queue.update((currentQueue) => currentQueue.filter((item) => item.id !== id));
}

if (browser) {
  queue.subscribe((value) => localStorage.setItem(key, serialize(value)));

  // By listening to the storage event, we can keep the store in sync with other tabs. This way,
  // the recent emojis are shared in real-time across all open tabs.
  window.addEventListener("storage", (event) => {
    if (event.key === key) {
      queue.set(deserialize(event.newValue || ""));
    }
  });
}

function serialize(value: QueuedUpload[]) {
  return JSON.stringify(value);
}

function deserialize(value: string): QueuedUpload[] {
  return JSON.parse(value);
}

export type QueuedUploadStatus =
  | "pending" // Waiting to start
  | "uploading" // Uploading to S3
  | "processing" // Server processing
  | "ingesting" // SDK ingestion running
  | "completed" // Successfully imported
  | "failed" // Upload or ingestion failed
  | "needs-confirmation"; // Duplicate detected, awaiting user action

export interface QueuedUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  status: QueuedUploadStatus;
  error?: string;
  resumable: boolean;
  // For duplicate confirmation
  pendingId?: string;
  duplicateInfo?: DuplicateCheckResult;
}
