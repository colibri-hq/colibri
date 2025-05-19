import type { Client } from "./index.js";
import {
  type Bucket,
  type BucketCannedACL,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListBucketsCommand,
} from "@aws-sdk/client-s3";

export async function createBucket(
  storage: Client,
  bucketName: string,
  acl: BucketCannedACL = "authenticated-read",
): Promise<string | undefined> {
  const response = await storage.send(
    new CreateBucketCommand({
      ACL: acl,
      Bucket: bucketName,
      ObjectOwnership: "BucketOwnerPreferred",
    }),
  );

  return response.Location;
}

export async function removeBucket(
  storage: Client,
  bucketName: string,
): Promise<void> {
  await storage.send(new DeleteBucketCommand({ Bucket: bucketName }));
}

export async function listBuckets(
  storage: Client,
  prefix?: string,
): Promise<Bucket[]> {
  const response = await storage.send(
    new ListBucketsCommand({
      Prefix: prefix,
    }),
  );

  return response.Buckets ?? [];
}
