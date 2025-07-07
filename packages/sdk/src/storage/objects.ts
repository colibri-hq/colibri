import {
  type _Object,
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
  ListObjectsV2Command,
  type ObjectCannedACL,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import type { Storage, StoredObject } from "./index.js";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { buffer as streamToBuffer } from "node:stream/consumers";
import { readFile, writeFile } from "node:fs/promises";
import { ReadableStream } from "node:stream/web";

export async function listObjects(
  { client, defaultBucket }: Storage,
  prefix: string,
  delimiter: string,
  bucketName: string = defaultBucket,
): Promise<StoredObject[]> {
  let response;
  const objects: Array<_Object> = [];

  do {
    response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: delimiter,
      }),
    );

    objects.push(...(response.Contents ?? []));
  } while (response.IsTruncated);

  return objects;
}

export async function removeObjects(
  { client, defaultBucket }: Storage,
  keys: string | string[],
  abortSignal?: AbortSignal,
  bucket: string = defaultBucket,
): Promise<void> {
  keys = Array.isArray(keys) ? keys : [keys];

  if (!keys.length) {
    return;
  }

  if (keys.length === 1) {
    const [key] = keys;

    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
        abortSignal ? { abortSignal } : undefined,
      );
    } catch (cause) {
      throw new Error(`Failed to remove object "${key}": ${cause}`, { cause });
    }

    return;
  }

  try {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
      abortSignal ? { abortSignal } : undefined,
    );
  } catch (cause) {
    throw new Error(`Failed to remove ${keys.length} objects: ${cause}`, {
      cause,
    });
  }
}

export async function moveObject(
  storage: Storage,
  source: string | URL,
  destination: string | URL,
) {
  const { bucketName: sourceBucket, key: sourceKey } = new ObjectReference(
    source,
    storage.defaultBucket,
  );
  const { bucketName: destinationBucket, key: destinationKey } =
    new ObjectReference(destination, storage.defaultBucket);

  let destinationExists = false;

  const { ETag: DestinationETag } =
    (await statObject(storage, destinationKey, destinationBucket)) ?? {};
  const { ETag: SourceETag } =
    (await statObject(storage, sourceKey, sourceBucket)) ?? {};

  if (!SourceETag) {
    throw new Error(`Source object "${source}" does not exist`);
  }

  if (DestinationETag === SourceETag) {
    destinationExists = true;
  } else {
    throw new Error("Destination already exists with different content");
  }

  if (!destinationExists) {
    await copyObject(storage, source, destination);
  }

  await removeObjects(storage, sourceKey, undefined, sourceBucket);
}

export async function statObject(
  { client, defaultBucket }: Storage,
  key: string,
  bucketName: string = defaultBucket,
): Promise<HeadObjectCommandOutput | undefined> {
  try {
    return await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (error.name === "NoSuchKey") {
      return undefined;
    }

    throw new Error(
      `Failed to stat object "${key}" in bucket "${bucketName}": ${error.message}`,
      { cause: error },
    );
  }
}

export async function copyObject(
  storage: Storage,
  source: string | URL,
  destination: string | URL,
) {
  const sourceRef = new ObjectReference(source);
  const destinationRef = new ObjectReference(destination);

  // region From a local file to S3
  if (sourceRef.isFile && destinationRef.isS3) {
    const { bucketName, key } = destinationRef;
    const file = await readFile(sourceRef.localPath);

    return await uploadObject(storage, file, key, {}, bucketName);
  }
  // endregion

  // region From HTTP to S3
  if (sourceRef.isHttp && destinationRef.isS3) {
    const { bucketName, key } = destinationRef;
    const { body, status } = await fetch(sourceRef.url, {
      redirect: "follow",
      method: "GET",
      headers: { accept: "*/*" },
    });

    if (status !== 200) {
      throw new Error(
        `Failed to fetch object from "${sourceRef.url}": ${status}`,
      );
    }

    if (!body) {
      throw new Error(
        `Failed to fetch object from "${sourceRef.url}": No body in response`,
      );
    }

    return await uploadObject(
      storage,
      body as ReadableStream,
      key,
      {},
      bucketName,
    );
  }
  // endregion

  // region From S3 to a local file
  if (sourceRef.isS3 && destinationRef.isFile) {
    const path = destinationRef.localPath;

    const { bucketName, key } = sourceRef;
    const stream = await downloadObject(storage, key, bucketName);

    return await writeFile(path, stream);
  }
  // endregion

  // region From S3 to S3
  if (sourceRef.isS3 && destinationRef.isS3) {
    const { CopyObjectResult } = await storage.client.send(
      new CopyObjectCommand({
        Bucket: destinationRef.bucketName,
        CopySource: sourceRef.s3Path,
        Key: destinationRef.key,
      }),
    );

    return CopyObjectResult;
  }
  // endregion

  throw new Error(
    `Cannot copy from "${source}" to "${destination}": The Colibri ` +
      "SDK supports copying local files, HTTP URLs, and objects stored on " +
      "buckets to a bucket, and stored objects to local files",
  );
}

export async function downloadObject(
  { client, defaultBucket }: Storage,
  key: string,
  bucketName: string = defaultBucket,
) {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error(
      `Failed to download object "${key}" from bucket "${bucketName}": No body in response`,
    );
  }

  return response.Body.transformToByteArray();
}

type UploadObjectAcceptableFile =
  | File
  | Uint8Array
  | Buffer
  | Readable
  | ReadableStream<Uint8Array<ArrayBufferLike>>;
type UploadObjectOptions = {
  acl?: ObjectCannedACL | undefined;
  metadata?: Record<string, string> | undefined;
};
export async function uploadObject(
  { client, defaultBucket }: Storage,
  file: UploadObjectAcceptableFile,
  key: string,
  { acl = "authenticated-read", metadata }: UploadObjectOptions = {},
  bucketName: string = defaultBucket,
) {
  if (file instanceof Readable) {
    file = await streamToBuffer(file);
  } else if (file instanceof ReadableStream) {
    file = await streamToBuffer(Readable.fromWeb(file));
  }

  return await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file instanceof Blob ? await file.bytes() : file,
      ACL: acl,
      ContentLength: ArrayBuffer.isView(file) ? file.byteLength : file.size,
      Metadata: metadata,
    }),
  );
}

class ObjectReference {
  #normalizedPath: URL | undefined;

  constructor(
    public readonly sourcePath: string | URL,
    public readonly defaultBucket?: string,
  ) {}

  public get url() {
    if (!this.#normalizedPath) {
      if (this.sourcePath instanceof URL) {
        this.#normalizedPath = this.sourcePath;

        return this.#normalizedPath;
      }

      if (this.sourcePath.includes("://")) {
        const url = new URL(this.sourcePath);
        ObjectReference.#assertProtocolSupported(url);
        this.#normalizedPath = url;

        return this.#normalizedPath;
      }

      const [bucketName, ...keyParts] = this.defaultBucket
        ? [this.defaultBucket, this.sourcePath.trim()]
        : this.sourcePath.trim().split("/");

      if (!bucketName || keyParts.length === 0) {
        throw new Error(`Invalid S3 path: ${this.sourcePath}`);
      }

      this.#normalizedPath = new URL(keyParts.join("/"), `s3://${bucketName}/`);
    }

    return this.#normalizedPath;
  }

  public get isFile() {
    return this.url.protocol === "file:";
  }

  public get isS3() {
    return this.url.protocol === "s3:";
  }

  public get isHttp() {
    return this.url.protocol === "http:" || this.url.protocol === "https:";
  }

  public get localPath() {
    if (!this.isFile) {
      throw new Error(
        `Cannot resolve local path from object reference "${this.sourcePath}": ` +
          `Not a file:// URL`,
      );
    }

    return fileURLToPath(this.url);
  }

  public get bucketName() {
    if (!this.isS3) {
      throw new Error(
        `Cannot resolve bucket from object reference "${this.sourcePath}": ` +
          `Not an s3:// URL`,
      );
    }

    return this.url.hostname;
  }

  public get key() {
    if (!this.isS3) {
      throw new Error(
        `Cannot resolve key from object reference "${this.sourcePath}": ` +
          `Not an s3:// URL`,
      );
    }

    return this.url.pathname.slice(1);
  }

  public get s3Path() {
    return `${this.bucketName}/${this.key}`;
  }

  static isProtocolSupported(protocol: string) {
    return ["s3:", "file:", "http:", "https:"].includes(protocol);
  }

  static #assertProtocolSupported(url: URL) {
    if (!ObjectReference.isProtocolSupported(url.protocol)) {
      throw new Error(
        `Invalid object reference "${url}": Unsupported protocol "${url.protocol}"`,
      );
    }
  }
}
