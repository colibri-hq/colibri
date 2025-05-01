import { env } from "$env/dynamic/private";
import {
  client,
  generatePresignedDownloadUrl,
  generatePresignedUploadUrl,
  readFile,
  streamFile,
} from "@colibri-hq/sdk/storage";

export function storage(): ReturnType<typeof client> {
  return client({
    region: env.S3_PROTOCOL_REGION,
    endpoint: env.STORAGE_S3_URL,
    accessKeyId: env.S3_PROTOCOL_ACCESS_KEY_ID,
    secretAccessKey: env.S3_PROTOCOL_ACCESS_KEY_SECRET,
  });
}

export async function read(bucket: string, filename: string) {
  return readFile(storage(), bucket, filename);
}

export async function stream(bucket: string, filename: string) {
  return streamFile(storage(), bucket, filename);
}

export async function downloadUrl(
  bucket: string,
  filename: string,
  expiresIn: number = 3600,
) {
  return generatePresignedDownloadUrl(storage(), bucket, filename, expiresIn);
}

export async function uploadUrl(
  bucket: string,
  filename: string,
  expiresIn: number = 3600,
  checksum: Buffer | Uint8Array | ArrayBufferLike,
  metadata?: Record<string, string>,
) {
  return generatePresignedUploadUrl(
    storage(),
    bucket,
    filename,
    expiresIn,
    checksum,
    metadata,
  );
}
