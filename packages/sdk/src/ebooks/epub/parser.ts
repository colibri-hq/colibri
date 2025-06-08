type EpubSource = {
  load: (signal?: AbortSignal) => Promise<string>;
  loadBlob: (signal?: AbortSignal) => Promise<Blob>;
};

export function parse(file: File) {}
