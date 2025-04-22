import { browser } from '$app/environment';
import type {
  CancelUploadRequest,
  ResumeRequest,
  UploadRequest,
  UploadResponse,
} from '$lib/workers/upload.worker';
import { loadWorker, type WebWorker } from '$lib/workers/workers';
import { generateRandomUuid } from '@colibri-hq/shared';
import { derived, get, writable } from 'svelte/store';

export const supportedUploadFormats = [
  {
    description: 'EPUB eBook',
    accept: {
      'application/epub+zip': '.epub',
    },
  },
  {
    description: 'PDF Document',
    accept: {
      'application/pdf': '.pdf',
      'application/x-pdf': '.pdf',
    },
  },
  {
    description: 'Amazon eBook',
    accept: {
      'application/azw3': '.azw3',
      'application/x-mobi8-ebook': '.azw3',
      'application/vnd.amazon.mobi8-ebook': '.azw3',
    },
  },
  {
    description: 'Mobipocket eBook',
    accept: {
      'application/x-mobipocket-ebook': ['.mobi', '.prc'],
      'application/octet-stream': ['.mobi', '.prc'],
    },
  },
] satisfies FilePickerAcceptType[];

let worker: WebWorker<
  UploadRequest | ResumeRequest | CancelUploadRequest,
  UploadResponse
> | null = null;

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
      ready: false,
      failed: false,
      resumable: true,
    }),
  );

  queue.update((queued) => [...queued, ...jobs]);
  // endregion

  worker.addEventListener('message', ({ data: { type, payload } }) => {
    // TODO: Show notification or something?
    console.log('Got worker result [upload]', { type, payload });
  });

  worker.addEventListener('error', (event) => {
    console.error('Worker failed', { event });

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
    { type: 'upload', payload: { files } },
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

  worker.addEventListener('message', ({ data: { type, payload } }) => {
    console.log('Got worker result', { type, payload });
  });

  worker.postMessage({
    type: 'resume',
    payload: { ids },
  });
}

export async function promptForFiles() {
  const files = await showOpenFilePicker({
    multiple: true,
    startIn: 'documents',
    types: supportedUploadFormats,
  });

  return Promise.all(files.map((file) => file.getFile()));
}

async function loadUploadsWorker() {
  if (worker === null) {
    const workerModule = import('$lib/workers/upload.worker?worker');

    worker = await loadWorker<
      UploadRequest | ResumeRequest | CancelUploadRequest,
      UploadResponse
    >(workerModule);

    worker.addEventListener(
      'message',
      ({
        data: {
          payload: { id, failed },
        },
      }) => {
        queue.update((queue) =>
          failed
            ? queue.map((item) =>
                item.id === id ? { ...item, failed } : item,
              )!
            : queue.filter((item) => item.id !== id),
        );
      },
    );
  }

  return worker;
}

const key = 'colibri.uploads.queue';
const initialValue = browser
  ? deserialize(localStorage.getItem(key) || '[]')
  : [];

const queue = writable(initialValue);

const exportedQueue = derived(queue, (s) => s);
export { exportedQueue as queue };

if (browser) {
  queue.subscribe((value) => localStorage.setItem(key, serialize(value)));

  // By listening to the storage event, we can keep the store in sync with other tabs. This way,
  // the recent emojis are shared in real-time across all open tabs.
  window.addEventListener('storage', (event) => {
    if (event.key === key) {
      queue.set(deserialize(event.newValue || ''));
    }
  });
}

function serialize(value: QueuedUpload[]) {
  return JSON.stringify(value);
}

function deserialize(value: string): QueuedUpload[] {
  return JSON.parse(value);
}

interface QueuedUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  ready: boolean;
  failed: boolean;
  resumable: boolean;
}
