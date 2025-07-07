import type { Storage } from "./index.js";
import {
  type Bucket,
  type BucketCannedACL,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListBucketsCommand,
} from "@aws-sdk/client-s3";

export async function createBucket(
  { client, defaultBucket }: Storage,
  bucketName: string = defaultBucket,
  acl: BucketCannedACL = "authenticated-read",
): Promise<string | undefined> {
  const response = await client.send(
    new CreateBucketCommand({
      ACL: acl,
      Bucket: bucketName,
      ObjectOwnership: "BucketOwnerPreferred",
    }),
  );

  return response.Location;
}

export async function removeBucket(
  { client, defaultBucket }: Storage,
  bucketName: string = defaultBucket,
): Promise<void> {
  await client.send(new DeleteBucketCommand({ Bucket: bucketName }));
}

export async function listBuckets(
  { client }: Storage,
  prefix?: string,
): Promise<Bucket[]> {
  const response = await client.send(
    new ListBucketsCommand({
      Prefix: prefix,
    }),
  );

  return response.Buckets ?? [];
}
