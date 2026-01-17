import {
  generatePresignedDownloadUrl,
  generatePresignedUploadUrl,
  readFile,
  type Storage,
  streamFile,
} from "@colibri-hq/sdk/storage";

export async function read(storage: Storage, filename: string, bucket?: string) {
  return readFile(storage, filename, bucket);
}

export async function stream(storage: Storage, filename: string, bucket?: string) {
  return streamFile(storage, filename, bucket);
}

export async function downloadUrl(
  storage: Storage,
  filename: string,
  expiresIn: number = 3600,
  bucket?: string,
) {
  return generatePresignedDownloadUrl(storage, filename, expiresIn, bucket);
}

export async function uploadUrl(
  storage: Storage,
  filename: string,
  expiresIn: number = 3600,
  checksum: Buffer | Uint8Array | ArrayBufferLike,
  metadata?: Record<string, string>,
  bucket?: string,
) {
  return generatePresignedUploadUrl(storage, filename, expiresIn, checksum, metadata, bucket);
}
