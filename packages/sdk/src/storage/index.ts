import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { encodeToBase64 } from "@colibri-hq/shared";
import packageJson from "../../package.json" with { type: "json" };

const { version } = packageJson;

type StorageOptions = {
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
};

export function client({
  region,
  endpoint,
  accessKeyId,
  secretAccessKey,
  forcePathStyle = true,
}: StorageOptions): S3Client {
  return new S3Client({
    region,
    endpoint,
    forcePathStyle,
    customUserAgent: `colibri-sdk/${version}`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function downloadObject(
  storage: S3Client,
  bucket: string,
  filename: string,
) {
  return storage.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: filename,
    }),
  );
}

export async function readFile(
  storage: S3Client,
  bucket: string,
  filename: string,
): Promise<Uint8Array> {
  try {
    const response = await downloadObject(storage, bucket, filename);

    return response.Body?.transformToByteArray() ?? new Uint8Array();
  } catch (cause) {
    console.error({ cause });
    throw new Error(`Failed to read file ${filename}`, { cause });
  }
}

export async function streamFile<T>(
  storage: S3Client,
  bucket: string,
  filename: string,
): Promise<ReadableStream<T>> {
  try {
    const response = await downloadObject(storage, bucket, filename);

    return response.Body?.transformToWebStream() ?? new ReadableStream();
  } catch (cause) {
    throw new Error(`Failed to read file ${filename}: ${cause}`, { cause });
  }
}

export async function generatePresignedDownloadUrl(
  storage: S3Client,
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
  storage: S3Client,
  bucket: string,
  filename: string,
  expiresIn: number = 3600,
  checksum: Buffer | Uint8Array | ArrayBufferLike,
  metadata?: Record<string, string>,
) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Expires: new Date(Date.now() + expiresIn * 1_000),
    ChecksumSHA256: encodeToBase64(checksum),
    Metadata: { ...metadata },
  });

  return await getSignedUrl(storage, command, { expiresIn });
}
