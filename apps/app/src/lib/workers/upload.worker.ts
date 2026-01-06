import { log } from "$lib/logging";
import { trpc as t } from "$lib/trpc/client";
import type {
  CancelPayload,
  CancelUploadRequest,
  ResumePayload,
  ResumeRequest,
  UploadPayload,
  UploadRequest,
  UploadResponse,
  UploadStatus,
} from "$lib/workers/upload.worker.types";
import { encodeToBase64 } from "@colibri-hq/shared";
import { loadMetadata, type Metadata } from "@colibri-hq/sdk/ebooks";

// Re-export types for any code that imports directly from the worker
export type {
  CancelPayload,
  CancelUploadRequest,
  ResumePayload,
  ResumeRequest,
  UploadPayload,
  UploadRequest,
  UploadResponse,
  UploadStatus,
} from "$lib/workers/upload.worker.types";

// In web workers, self.location.href is a blob URL like "blob:http://localhost:5173/uuid"
// We need to extract the actual origin for the tRPC client
function getWorkerOriginUrl(): URL {
  const href = self.location.href;
  if (href.startsWith("blob:")) {
    // Extract origin from blob URL: "blob:http://localhost:5173/uuid" -> "http://localhost:5173"
    return new URL(href.slice(5));
  }
  return new URL(href);
}

const trpc = t({
  fetch,
  url: getWorkerOriginUrl(),
});

const pending = new Map<string, AbortController>();
let root: FileSystemDirectoryHandle | null = null;

// declare const self: WorkerGlobalScope;

self.addEventListener("unhandledrejection", ({ reason }) => {
  throw reason;
});

self.addEventListener("message", handleMessage);

async function handleMessage({
  data,
}: MessageEvent<UploadRequest | ResumeRequest | CancelUploadRequest>) {
  const { type, payload } = data;

  switch (type) {
    case "cancel":
      return (payload as CancelPayload).id
        ? await handleCancelUpload({ id: (payload as CancelPayload).id! })
        : await handleCancelAllUploads(payload as CancelPayload);

    case "upload":
      return await handleUpload(payload as UploadPayload);

    case "resume":
      return handleResumption(payload as ResumePayload);
  }
}

async function handleUpload({ files }: UploadPayload) {
  log("worker:upload", "info", `Uploading ${files.length} books`);

  const uploadsDirectory = await getUploadsDirectory();

  // Ensure we have abort controller instances for all files, so we can handle intermediate aborts
  files.forEach(({ id }) => pending.set(id, new AbortController()));

  // Copy the file streams into the OPFS. If the operation is aborted mid-flight, we'll cancel the
  // stream copy, which should yield a clean state.
  const operations = files.map(async ({ id, name, buffer }) => {
    const { signal } = pending.get(id)!;
    signal.throwIfAborted();

    const container = await uploadsDirectory.getDirectoryHandle(id, {
      create: true,
    });

    let handle: FileSystemFileHandle;

    try {
      handle = await writeFile(new File([buffer], name), container);
    } catch {
      return self.postMessage({
        type: "upload",
        payload: {
          error: "Upload Cancelled",
          failed: true,
          id,
          name,
        },
      } satisfies UploadResponse);
    }

    const asset = await handle.getFile();
    const checksum = await crypto.subtle.digest("SHA-256", buffer);

    // Notify main thread that we're starting the upload
    self.postMessage({
      type: "upload",
      payload: { id, name, status: "uploading" as const, failed: false },
    } satisfies UploadResponse);

    // Step 1: Get upload URL (checks for exact duplicates by checksum)
    const uploadResult = await trpc.books.getUploadUrl.mutate({
      uploadId: id,
      checksum: encodeToBase64(checksum),
      mimeType: asset.type,
      size: asset.size,
      filename: name,
    });

    if (uploadResult.duplicate) {
      // Exact duplicate found - skip upload and clean up
      await finalizeUpload(id);
      self.postMessage({
        type: "upload",
        payload: { id, name, duplicate: true, failed: false },
      } satisfies UploadResponse);
      return handle;
    }

    // Step 2: Upload file to S3
    const { uploadUrl, s3Key } = uploadResult;
    log("worker:upload", "info", `Uploading to S3: ${s3Key}`);

    await uploadAsset(uploadUrl, asset, checksum, signal);

    // Step 3: Trigger server-side ingestion
    // The server will emit SSE events for progress updates and completion
    self.postMessage({
      type: "upload",
      payload: { id, name, status: "processing" as const, failed: false },
    } satisfies UploadResponse);

    await trpc.books.ingest.mutate({
      uploadId: id,
      s3Key,
      filename: name,
    });

    // Step 4: Clean up OPFS
    await finalizeUpload(id);

    // Notify main thread that upload phase is complete
    // The actual import status will come via SSE
    self.postMessage({
      type: "upload",
      payload: { id, name, status: "ingesting" as const, failed: false },
    } satisfies UploadResponse);

    return handle;
  });

  try {
    await Promise.all(operations);
  } catch (cause) {
    throw new Error(
      `Failed to upload files: ${(cause as Error).message}: ${(cause as Error).stack}`,
      {
        cause,
      },
    );
  }
}

async function uploadAsset(
  url: string,
  asset: File,
  checksum: ArrayBuffer,
  signal?: AbortSignal,
) {
  const controller = new AbortController();
  const { signal: uploadSignal } = controller;

  signal?.addEventListener("abort", () => controller.abort());

  const response = await fetch(url, {
    signal: uploadSignal,
    method: "PUT",
    headers: {
      "Content-Type": asset.type,
    },
    body: await asset.arrayBuffer(),

    // Streaming won't work on HTTP/1.1, so we'd need TLS during local
    // development, which is too much of a hassle for now.
    //
    // body: asset.stream(),
    //
    // // See https://developer.chrome.com/docs/capabilities/web-apis/fetch-streaming-requests#half_duplex
    // // @ts-expect-error This is not documented in the stubs yet
    // duplex: 'half',
  });

  if (!response.ok) {
    console.error("Failed to upload asset", {
      status: response.status,
      statusText: response.statusText,
      url,
      body: await response.text(),
    });

    throw new Error(`Failed to upload asset: ${response.statusText}`);
  }
}

async function finalizeUpload(id: string) {
  const uploadsDirectory = await getUploadsDirectory();
  await uploadsDirectory.removeEntry(id, { recursive: true });
}

async function handleResumption({ ids }: ResumePayload) {
  log(
    "worker:upload",
    "info",
    `Resuming pending upload of ${ids.length} books`,
    { ids },
  );

  const directory = await getUploadsDirectory();
  const resumable = await resolveResumableFiles(directory, ids);

  // Notify main thread about items that couldn't be found in OPFS
  const resumableIds = new Set(resumable.map(({ id }) => id));
  const staleIds = ids.filter((id) => !resumableIds.has(id));
  for (const id of staleIds) {
    self.postMessage({
      type: "upload",
      payload: {
        id,
        name: "Unknown",
        failed: true,
        error: "Upload data not found - please re-upload",
      },
    } satisfies UploadResponse);
  }

  // Resume uploads using the same flow as new uploads
  for (const { id, file, container } of resumable) {
    const controller = new AbortController();
    pending.set(id, controller);
    const { signal } = controller;

    try {
      const buffer = await file.arrayBuffer();
      const checksum = await crypto.subtle.digest("SHA-256", buffer);

      // Notify main thread
      self.postMessage({
        type: "upload",
        payload: {
          id,
          name: file.name,
          status: "uploading" as const,
          failed: false,
        },
      } satisfies UploadResponse);

      // Get upload URL
      const uploadResult = await trpc.books.getUploadUrl.mutate({
        uploadId: id,
        checksum: encodeToBase64(checksum),
        mimeType: file.type,
        size: file.size,
        filename: file.name,
      });

      if (uploadResult.duplicate) {
        await directory.removeEntry(id, { recursive: true });
        self.postMessage({
          type: "upload",
          payload: { id, name: file.name, duplicate: true, failed: false },
        } satisfies UploadResponse);
        continue;
      }

      // Upload to S3
      const { uploadUrl, s3Key } = uploadResult;
      await uploadAsset(uploadUrl, file, checksum, signal);

      // Trigger ingestion
      self.postMessage({
        type: "upload",
        payload: {
          id,
          name: file.name,
          status: "processing" as const,
          failed: false,
        },
      } satisfies UploadResponse);

      await trpc.books.ingest.mutate({
        uploadId: id,
        s3Key,
        filename: file.name,
      });

      // Clean up
      await directory.removeEntry(id, { recursive: true });

      self.postMessage({
        type: "upload",
        payload: {
          id,
          name: file.name,
          status: "ingesting" as const,
          failed: false,
        },
      } satisfies UploadResponse);
    } catch (error) {
      self.postMessage({
        type: "upload",
        payload: {
          id,
          name: file.name,
          failed: true,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      } satisfies UploadResponse);
    } finally {
      pending.delete(id);
    }
  }
}

async function handleCancelUpload({ id }: Required<CancelPayload>) {
  log("worker:upload", "warning", `Cancelling upload for #${id}`);
  const upload = pending.get(id);

  if (!upload) {
    return;
  }

  upload.abort("cancelled");
  self.postMessage({
    type: "upload",
    payload: {
      id,
      name: "Unknown", // Name not available during cancel
      failed: true,
      error: "Upload Cancelled",
    },
  } satisfies UploadResponse);
}

async function handleCancelAllUploads(_payload: CancelPayload) {
  log("worker:upload", "warning", "Cancelling all pending uploads");

  for (const [id, controller] of pending.entries()) {
    controller.abort("cancelled");

    self.postMessage({
      type: "upload",
      payload: {
        id,
        name: "Unknown", // Name not available during cancel
        failed: true,
        error: "Upload Cancelled",
      },
    } satisfies UploadResponse);
  }
}

/**
 * Process a file and extract metadata from it.
 *
 * If the file is an EPUB or PDF, we will extract the metadata and cover image.
 * If the file is a MOBI, we will just return the file as is.
 *
 * @param id
 * @param file
 * @param container
 * @param signal
 */
async function processFile(
  id: string,
  file: File,
  container: FileSystemDirectoryHandle,
  signal?: AbortSignal,
) {
  log("worker:upload", "info", `Processing uploaded file`, { id, file });
  let cover: Blob | undefined = undefined;
  let metadata: Metadata;

  try {
    metadata = await readMetadataFile(container);

    try {
      cover = await readCoverFile(container);
    } catch {
      // No cover found, ignore
    }
  } catch {
    metadata = await loadMetadata(file, signal);

    if (metadata.cover) {
      cover = metadata.cover;

      await writeCoverFile(metadata.cover, container, signal);
      delete metadata.cover;
    }

    await writeMetadataFile(metadata, container);
  }

  return {
    id,
    cover,
    metadata,
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    },
  };
}

async function writeMetadataFile(
  metadata: Metadata,
  container: FileSystemDirectoryHandle,
) {
  const metadataFile = new File([JSON.stringify(metadata)], metadataFilename, {
    type: "application/json",
  });

  return writeFile(metadataFile, container);
}

async function readMetadataFile(container: FileSystemDirectoryHandle) {
  const metadataFileHandle = await container.getFileHandle(metadataFilename, {
    create: false,
  });
  const metadataFile = await metadataFileHandle.getFile();
  const plaintext = await metadataFile.text();

  return JSON.parse(plaintext) as Metadata;
}

async function writeCoverFile(
  blob: Blob,
  container: FileSystemDirectoryHandle,
  signal?: AbortSignal,
) {
  const coverFile = new File([blob], coverFilename, { type: blob.type });

  return writeFile(coverFile, container, signal);
}

async function readCoverFile(container: FileSystemDirectoryHandle) {
  const coverFileHandle = await container.getFileHandle(coverFilename, {
    create: false,
  });

  return await coverFileHandle.getFile();
}

async function writeFile(
  file: File,
  container: FileSystemDirectoryHandle,
  signal?: AbortSignal,
) {
  const handle = await container.getFileHandle(file.name, { create: true });
  const writable = await handle.createWritable({ keepExistingData: false });
  const promise = writable.write(file);

  signal?.addEventListener("abort", async (cause) => {
    await writable.abort(cause);

    throw new Error("Write operation aborted", { cause });
  });

  await promise;

  if (!signal?.aborted) {
    await writable.close();
  }

  return handle;
}

async function getFilesystemRoot() {
  if (root === null) {
    root = await navigator.storage.getDirectory();
  }

  return root;
}

async function getUploadsDirectory() {
  const root = await getFilesystemRoot();

  return root.getDirectoryHandle("uploads", { create: true });
}

async function resolveResumableFiles(
  directory: FileSystemDirectoryHandle,
  ids: string[],
) {
  const fragments = await Promise.all(
    ids.map(async (id) => {
      try {
        const container = await directory.getDirectoryHandle(id, {
          create: false,
        });
        let file: File | undefined = undefined;

        for await (const entry of container.values()) {
          if (
            entry.kind === "file" &&
            ![metadataFilename, coverFilename].includes(entry.name)
          ) {
            file = await entry.getFile();
            break;
          }
        }

        return { id, file, container };
      } catch (error) {
        // Directory doesn't exist in OPFS - this can happen if the browser
        // was closed before the upload completed and OPFS was cleaned up
        if (error instanceof DOMException && error.name === "NotFoundError") {
          log(
            "worker:upload",
            "warning",
            `OPFS directory for upload ${id} not found, skipping`,
          );
          return { id, file: undefined, container: undefined };
        }
        throw error;
      }
    }),
  );

  return fragments.filter(
    (fragment): fragment is Resumable => typeof fragment.file !== "undefined",
  );
}

const metadataFilename = "metadata.json";
const coverFilename = "cover";

type Resumable = {
  id: string;
  file: File;
  container: FileSystemDirectoryHandle;
};
