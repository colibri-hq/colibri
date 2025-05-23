import { log } from "$lib/logging";
import { trpc as t } from "$lib/trpc/client";
import type { WorkerMessage } from "$lib/workers/workers";
import { encodeToBase64 } from "@colibri-hq/shared";
import { loadMetadata, type Metadata } from "@colibri-hq/sdk/ebooks";

const trpc = t({
  fetch,
  url: new URL(self.location.href),
});

const pending = new Map<string, AbortController>();
let root: FileSystemDirectoryHandle | null = null;

// declare const self: WorkerGlobalScope;

self.addEventListener("unhandledrejection", ({ reason }) => {
  throw reason;
});

self.addEventListener("message", handleMessage);

async function handleMessage({
  data: { type, payload },
}: MessageEvent<UploadRequest | ResumeRequest | CancelUploadRequest>) {
  switch (type) {
    case "cancel":
      return payload.id
        ? await handleCancelUpload({ id: payload.id })
        : await handleCancelAllUploads(payload);

    case "upload":
      return await handleUpload(payload);

    case "resume":
      return handleResumption(payload);
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
        },
      } satisfies UploadResponse);
    }

    const asset = await handle.getFile();

    // Extract details and metadata from the file
    const result = await processFile(id, asset, container, signal);
    const checksum = await crypto.subtle.digest("SHA-256", buffer);

    // Persist the new book in the database
    const reply = await trpc.books.create.mutate({
      asset: {
        checksum: encodeToBase64(checksum),
        mimeType: asset.type,
        size: asset.size,
      },
      contributors: result.metadata.contributors,
      title: result.metadata.title ?? "Untitled",
      numberOfPages: result.metadata.numberOfPages,
      language: result.metadata.language,
      legalInformation: result.metadata.legalInformation,
    });

    if (!reply) {
      self.postMessage({
        type: "upload",
        payload: { duplicate: true, failed: false, id },
      } satisfies UploadResponse);

      return handle;
    }

    const { assetUrl } = reply;

    console.log("Saved book, got upload URL", {
      assetUrl,
    });

    await uploadAsset(assetUrl, asset, signal);
    await finalizeUpload(id);

    self.postMessage({
      type: "upload",
      payload: { failed: false, result, id },
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

async function uploadAsset(url: string, asset: File, signal?: AbortSignal) {
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
  const results = await Promise.all(
    resumable.map(
      async ({ id, file, container }) =>
        [id, await processFile(id, file, container)] as const,
    ),
  );
  await Promise.all(
    resumable.map(({ id }) => directory.removeEntry(id, { recursive: true })),
  );

  results.forEach(([id, result]) =>
    self.postMessage({
      type: "upload",
      payload: {
        failed: false,
        result,
        id,
      },
    } satisfies UploadResponse),
  );
}

async function handleCancelUpload({ id }: Required<CancelPayload>) {
  log("worker:upload", "warning", `Cancelling upload for #${id}`);
  const upload = pending.get(id);

  if (!upload) {
    return;
  }

  upload.abort("cancelled");
  self.postMessage({
    id,
    failed: true,
    error: "Upload Cancelled",
  } satisfies UploadResponsePayload);
}

async function handleCancelAllUploads(_payload: CancelPayload) {
  log("worker:upload", "warning", "Cancelling all pending uploads");

  for (const [id, controller] of pending.entries()) {
    controller.abort("cancelled");

    self.postMessage({
      id,
      failed: true,
      error: "Upload Cancelled",
    } satisfies UploadResponsePayload);
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

type UploadPayload = {
  files: { id: string; name: string; buffer: ArrayBuffer }[];
};
export type UploadRequest = WorkerMessage<"upload", UploadPayload>;

type ResumePayload = {
  ids: string[];
};
export type ResumeRequest = WorkerMessage<"resume", ResumePayload>;

type CancelPayload = {
  id?: string;
};
export type CancelUploadRequest = WorkerMessage<"cancel", CancelPayload>;

type UploadResponsePayload =
  | {
      id: string;
      failed: true;
      error: string;
    }
  | {
      id: string;
      failed: false;
      duplicate: true;
    }
  | {
      id: string;
      failed: false;
      result: Record<string, unknown>;
    };
export type UploadResponse = WorkerMessage<"upload", UploadResponsePayload>;
