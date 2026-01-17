/**
 * Downloads ISO 639-3 language data from SIL International.
 *
 * Source: https://iso639-3.sil.org/code_tables/download_tables
 *
 * Run with: pnpm --filter @colibri-hq/languages run download
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

const FILES = [
  {
    name: "iso-639-3.tab",
    url: "https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3.tab",
  },
  {
    name: "iso-639-3_Name_Index.tab",
    url: "https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3_Name_Index.tab",
  },
];

async function download(url: string): Promise<string> {
  console.log(`Downloading ${url}…`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function main(): Promise<void> {
  console.log("Creating data directory…");
  await mkdir(DATA_DIR, { recursive: true });

  for (const file of FILES) {
    const content = await download(file.url);
    const path = join(DATA_DIR, file.name);
    await writeFile(path, content, "utf-8");
    console.log(`Saved ${file.name} (${content.length.toLocaleString()} bytes)`);
  }

  console.log("\nDownload complete!");
  console.log(
    "Run `pnpm --filter @colibri-hq/languages run generate` to generate TypeScript and SQL files.",
  );
}

main().catch((error) => {
  console.error("Download failed:", error);
  process.exit(1);
});
