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
import type { Client, StoredObject } from "./index.js";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { buffer as streamToBuffer } from "node:stream/consumers";
import { readFile, stat, writeFile } from "node:fs/promises";
import { File } from "node:buffer";

export async function listObjects(
  storage: Client,
  bucketName: string,
  prefix: string,
  delimiter: string,
): Promise<StoredObject[]> {
  let response;
  const objects: Array<_Object> = [];

  do {
    response = await storage.send(
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
  storage: Client,
  bucket: string,
  keys: string | string[],
  abortSignal?: AbortSignal,
): Promise<void> {
  keys = Array.isArray(keys) ? keys : [keys];

  if (!keys.length) {
    return;
  }

  if (keys.length === 1) {
    const [key] = keys;

    try {
      await storage.send(
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
    await storage.send(
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
  storage: Client,
  source: string | URL,
  destination: string | URL,
) {
  const { hostname: sourceBucket, pathname: sourceKey } = resolvePath(source);
  const { hostname: destinationBucket, pathname: destinationKey } =
    resolvePath(destination);

  let destinationExists = false;

  const { ETag: DestinationETag } =
    (await statObject(storage, destinationBucket, destinationKey)) ?? {};
  const { ETag: SourceETag } =
    (await statObject(storage, sourceBucket, sourceKey)) ?? {};

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

  await removeObjects(storage, sourceBucket, sourceKey);
}

export async function statObject(
  storage: Client,
  bucketName: string,
  key: string,
): Promise<HeadObjectCommandOutput | undefined> {
  try {
    return await storage.send(
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
  storage: Client,
  source: string | URL,
  destination: string | URL,
) {
  const sourceRef = new ObjectReference(source);
  const destinationRef = new ObjectReference(destination);

  // region From a local file to S3
  if (sourceRef.isFile && destinationRef.isS3) {
    const { bucketName, key } = destinationRef;
    const file = await readFile(sourceRef.localPath);

    return await uploadObject(storage, file, bucketName, key);
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

    const stream = Readable.fromWeb(body);

    return await uploadObject(storage, stream, bucketName, key);
  }
  // endregion

  // region From S3 to a local file
  if (sourceRef.isS3 && destinationRef.isFile) {
    const path = destinationRef.localPath;

    const { bucketName, key } = sourceRef;
    const stream = await downloadObject(storage, bucketName, key);

    return await writeFile(path, stream);
  }
  // endregion

  // region From S3 to S3
  if (sourceRef.isS3 && destinationRef.isS3) {
    const { CopyObjectResult } = await storage.send(
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
  storage: Client,
  bucketName: string,
  key: string,
) {
  const response = await storage.send(
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

export async function uploadObject(
  storage: Client,
  file: File | Uint8Array | Buffer | Readable,
  bucketName: string,
  key: string,
  { acl = "authenticated-read" }: { acl?: ObjectCannedACL } = {},
) {
  if (file instanceof Readable) {
    file = await streamToBuffer(file);
  }

  return await storage.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ACL: acl,
      ContentLength: ArrayBuffer.isView(file) ? file.byteLength : file.size,
    }),
  );
}

function resolvePath(path: URL | string) {
  if (path instanceof URL) {
    if (path.protocol === "file:") {
      return path;
    }

    if (path.protocol !== "s3:") {
      throw new Error(
        `Invalid object reference "${path}": Must be an s3:// URL ` +
          `or a relative path as a string.`,
      );
    }
  }

  path = path.toString();

  if (path.startsWith("s3://")) {
    const url = new URL(path);

    if (!url.hostname || !url.pathname) {
      throw new Error(`Invalid S3 URL: ${path}`);
    }
  }

  const [bucket, ...keyParts] = path.trim().split("/");

  if (!bucket || keyParts.length === 0) {
    throw new Error(`Invalid S3 path: ${path}`);
  }

  return new URL(keyParts.join("/"), `s3://${bucket}/`);
}

class ObjectReference {
  #normalizedPath: URL | undefined;

  constructor(public readonly sourcePath: string | URL) {}

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

      const [bucket, ...keyParts] = this.sourcePath.trim().split("/");

      if (!bucket || keyParts.length === 0) {
        throw new Error(`Invalid S3 path: ${this.sourcePath}`);
      }

      this.#normalizedPath = new URL(keyParts.join("/"), `s3://${bucket}/`);
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
