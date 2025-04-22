import { match as base64 } from "../../../src/params/base64.ts";
import { match as base64url } from "../../../src/params/base64url.ts";
import { match as encoded_path } from "../../../src/params/encoded_path.ts";
import { match as id } from "../../../src/params/id.ts";

export const matchers = { base64, base64url, encoded_path, id };