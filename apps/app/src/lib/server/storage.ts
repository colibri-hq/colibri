import {
  S3_PROTOCOL_ACCESS_KEY_ID,
  S3_PROTOCOL_ACCESS_KEY_SECRET,
  S3_PROTOCOL_REGION,
  STORAGE_S3_URL,
} from '$env/static/private';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const client = new S3Client({
  region: S3_PROTOCOL_REGION,
  endpoint: STORAGE_S3_URL,
  forcePathStyle: true,
  credentials: {
    accessKeyId: S3_PROTOCOL_ACCESS_KEY_ID,
    secretAccessKey: S3_PROTOCOL_ACCESS_KEY_SECRET,
  },
});

export function downloadObject(bucket: string, filename: string) {
  return client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: filename,
    }),
  );
}

export async function readFile(
  platform: Readonly<App.Platform> | undefined,
  bucket: string,
  filename: string,
) {
  try {
    const response = await downloadObject(bucket, filename);

    return response.Body?.transformToByteArray() ?? new Uint8Array();
  } catch (cause) {
    console.error({ cause });
    throw new Error(`Failed to read file ${filename}`, { cause });
  }
}

export async function streamFile(
  platform: Readonly<App.Platform> | undefined,
  bucket: string,
  filename: string,
) {
  try {
    const response = await downloadObject(bucket, filename);

    return response.Body?.transformToWebStream() ?? new ReadableStream();
  } catch (cause) {
    console.error({ cause });
    throw new Error(`Failed to read file ${filename}`, { cause });
  }
}

export async function generatePresignedDownloadUrl(
  bucket: string,
  filename: string,
  expiresIn: number = 3600,
) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: filename,
  });
  return await getSignedUrl(client, command, {
    expiresIn,
  });
}

export async function generatePresignedUploadUrl(
  bucket: string,
  filename: string,
  expiresIn: number = 3600,
  checksum: Buffer | ArrayBufferLike,
  metadata?: Record<string, string>,
) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Expires: new Date(Date.now() + expiresIn * 1_000),
    // ChecksumSHA256: encodeToBase64(checksum),
    // Metadata: { ...metadata },
  });

  return await getSignedUrl(client, command, {
    expiresIn,
  });
}
