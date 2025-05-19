import packageJson from "../../package.json" with { type: "json" };
import { S3Client } from "@aws-sdk/client-s3";
import type { Client } from "./index.js";

const { version } = packageJson;

type StorageOptions = {
  region?: string | undefined;
  endpoint?: string | undefined;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean | undefined;
  clientOptions?: ConstructorParameters<typeof S3Client>[0];
};

export function client({
  region,
  endpoint,
  accessKeyId,
  secretAccessKey,
  forcePathStyle = true,
  clientOptions,
}: StorageOptions): Client {
  // @ts-ignore -- exact optional property types problem, but completely valid
  return new S3Client({
    ...clientOptions,
    credentials: { accessKeyId, secretAccessKey },
    customUserAgent: `colibri-sdk/${version}`,
    endpoint,
    forcePathStyle,
    region,
  });
}
