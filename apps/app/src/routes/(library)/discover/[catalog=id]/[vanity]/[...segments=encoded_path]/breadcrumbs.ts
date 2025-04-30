import { decodeFromBase64, encodeToBase64 } from "@colibri-hq/shared";

export function decodeBreadcrumbs(breadcrumbs: string): [string, string] {
  return JSON.parse(decodeFromBase64(breadcrumbs, true));
}

export function encodeBreadcrumbs(breadcrumbs: [string, string]) {
  return encodeToBase64(JSON.stringify(breadcrumbs), true);
}
