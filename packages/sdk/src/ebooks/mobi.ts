import type { Metadata } from "./metadata.js";

export async function isMobiFile(file: File): Promise<boolean> {
  const buffer = await file.slice(60, 68).arrayBuffer();
  const fingerprint = new TextDecoder().decode(buffer);

  return fingerprint === "BOOKMOBI";
}

export async function loadMobiMetadata(
  _file: File,
  _signal?: AbortSignal,
): Promise<Metadata> {
  return {} as Metadata;
}

export async function loadMobi(): Promise<unknown> {
  // TODO: Implement loading of mobi files
  throw new Error("Mobi loading not implemented");
}
