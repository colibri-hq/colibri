type _EpubSource = {
  load: (signal?: AbortSignal) => Promise<string>;
  loadBlob: (signal?: AbortSignal) => Promise<Blob>;
};

export function parse(_file: File) {}
