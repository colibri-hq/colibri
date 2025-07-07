import { type _Object, S3Client } from "@aws-sdk/client-s3";

export type Client = S3Client;
export type StoredObject = _Object;
export type Storage = {
  client: S3Client;
  defaultBucket: string;
};
