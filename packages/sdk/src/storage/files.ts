import type { Client } from "./types.js";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { encodeToBase64 } from "@colibri-hq/shared";
import { downloadObject } from "./objects.js";
import { ReadableStream } from "node:stream/web";

export async function readFile(
  storage: Client,
  bucket: string,
  filename: string,
): Promise<Uint8Array> {
  try {
    return await downloadObject(storage, bucket, filename);
  } catch (cause) {
    console.error({ cause });
    throw new Error(`Failed to read file ${filename}`, { cause });
  }
}

export async function streamFile(
  storage: Client,
  bucket: string,
  filename: string,
): Promise<ReadableStream> {
  try {
    const response = await downloadObject(storage, bucket, filename);

    return ReadableStream.from(response);
  } catch (cause) {
    throw new Error(`Failed to read file ${filename}: ${cause}`, { cause });
  }
}

export async function generatePresignedDownloadUrl(
  storage: Client,
  bucket: string,
  filename: string,
  expiresIn: number = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: filename,
  });

  return await getSignedUrl(storage, command, { expiresIn });
}

export async function generatePresignedUploadUrl(
  storage: Client,
  bucket: string,
  filename: string,
  expiresIn: number = 3_600,
  checksum: Buffer | Uint8Array | ArrayBufferLike,
  metadata?: Record<string, string>,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Expires: new Date(Date.now() + expiresIn * 1_000),
    ChecksumSHA256: encodeToBase64(checksum),
    Metadata: { ...metadata },
  });

  return await getSignedUrl(storage, command, { expiresIn });
}
