import type { Storage } from "./types.js";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { encodeToBase64 } from "@colibri-hq/shared";
import { downloadObject, uploadObject } from "./objects.js";
import { ReadableStream } from "node:stream/web";

export async function writeFile(
  storage: Storage,
  file: File,
  metadata?: Record<string, string>,
  bucket: string = storage.defaultBucket,
): Promise<URL> {
  try {
    await uploadObject(storage, file, file.name, { metadata }, bucket);
  } catch (cause) {
    throw new Error(`Failed to write file "${file.name}": ${cause}`, { cause });
  }

  return new URL(file.name, `s3://${bucket}/`);
}

export async function readFile(
  storage: Storage,
  filename: string,
  bucket?: string,
): Promise<Uint8Array> {
  try {
    return await downloadObject(storage, filename, bucket);
  } catch (cause) {
    throw new Error(`Failed to read file ${filename}`, { cause });
  }
}

export async function streamFile(
  storage: Storage,
  filename: string,
  bucket?: string,
): Promise<ReadableStream> {
  try {
    const response = await downloadObject(storage, filename, bucket);

    return ReadableStream.from(response);
  } catch (cause) {
    throw new Error(`Failed to read file ${filename}: ${cause}`, { cause });
  }
}

export async function generatePresignedDownloadUrl(
  { client, defaultBucket }: Storage,
  filename: string,
  expiresIn: number = 3600,
  bucket: string = defaultBucket,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: filename,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

export async function generatePresignedUploadUrl(
  { client, defaultBucket }: Storage,
  filename: string,
  expiresIn: number = 3_600,
  checksum: Buffer | Uint8Array | ArrayBufferLike,
  metadata?: Record<string, string>,
  bucket: string = defaultBucket,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Expires: new Date(Date.now() + expiresIn * 1_000),
    ChecksumSHA256: encodeToBase64(checksum),
    Metadata: { ...metadata },
  });

  return await getSignedUrl(client, command, { expiresIn });
}
