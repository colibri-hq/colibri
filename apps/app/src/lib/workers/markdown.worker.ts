// @ts-expect-error - marked is available but not in package.json types
import { marked } from "marked";

onmessage = function handleMessage({ data }: MessageEvent<string>) {
  postMessage(marked.parse(data));
};
