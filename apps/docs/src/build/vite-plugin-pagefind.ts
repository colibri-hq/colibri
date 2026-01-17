import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { glob } from "glob";
import matter from "gray-matter";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as pagefind from "pagefind";

/**
 * Vite plugin for Pagefind integration in dev mode.
 *
 * Dev mode: Builds index from Markdown files at startup, watches for changes, and serves the index
 * via middleware.
 *
 * Build mode: Production indexing is handled by the `pagefind` CLI in the build script (runs after
 * adapter-static writes files to dist/).
 */

type PagefindPluginOptions = { contentDir?: string };

export function pagefindPlugin({
  contentDir = resolve(`${import.meta.dirname}/../../content/`),
}: PagefindPluginOptions = {}): Plugin {
  const indexFiles: Map<string, Uint8Array> = new Map();
  let config: ResolvedConfig;
  let indexReady = false;

  // Dev mode: Build index from markdown files
  async function buildDevIndex(server: ViteDevServer) {
    server.config.logger.info("Building dev search index…");
    const startTime = Date.now();

    const { index, errors } = await pagefind.createIndex({});

    if (!index) {
      server.config.logger.error(`Failed to create index: ${errors.join(", ")}`, {
        timestamp: true,
      });

      return;
    }

    try {
      const files = await glob(`${contentDir}/**/*.md`, { cwd: config.root });

      for (const file of files) {
        const filePath = resolve(config.root, file);
        const content = await readFile(filePath, "utf-8");
        const { data: frontmatter, content: markdown } = matter(content);

        if (frontmatter.draft) {
          continue;
        }

        const url = fileToUrl(file, contentDir);
        const plainText = stripMarkdown(markdown);

        await index.addCustomRecord({
          url,
          content: plainText,
          language: "en",
          meta: {
            title: String(frontmatter.title || url),
            description: String(frontmatter.description || ""),
          },
        });
      }

      const { files: generatedFiles } = await index.getFiles();
      indexFiles.clear();

      for (const file of generatedFiles) {
        indexFiles.set(file.path, file.content);
      }

      indexReady = true;

      server.config.logger.info(`Indexed ${files.length} pages in ${Date.now() - startTime}ms`, {
        timestamp: true,
      });
    } finally {
      await index.deleteIndex();
    }
  }

  // noinspection JSUnusedGlobalSymbols
  return {
    name: "vite-plugin-pagefind",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    // Tell Vite to treat /pagefind/* imports as external in dev mode. This prevents
    // vite:import-analysis from failing on the dynamic import
    resolveId(id) {
      // Return the id with external: true to tell Vite not to resolve it
      if (id.startsWith("/pagefind/")) {
        return { id, external: true };
      }
    },

    configureServer(server) {
      buildDevIndex(server).catch((error) => {
        server?.config.logger.error(`Failed to build dev index: ${error}`, {
          timestamp: true,
          error,
        });
      });

      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/pagefind/")) {
          // Strip query string (pagefind adds ?ts=... for cache busting)
          const urlPath = req.url.split("?")[0];
          const filePath = urlPath?.replace("/pagefind/", "") ?? "";
          const content = indexFiles.get(filePath);

          if (content) {
            res.setHeader("Content-Type", getMimeType(filePath));
            res.setHeader("Cache-Control", "no-cache");
            res.end(Buffer.from(content));

            return;
          }

          // If index isn't ready yet, return a helpful message
          if (!indexReady && filePath === "pagefind.js") {
            res.setHeader("Content-Type", "application/javascript");
            res.end(`
              // Pagefind index is still building…
              export function init() { return Promise.resolve(); }
              export function search() { return Promise.resolve({ results: [] }); }
              export function debouncedSearch() { return Promise.resolve({ results: [] }); }
              export function preload() { return Promise.resolve(); }
            `);
            return;
          }
        }
        next();
      });
    },

    async handleHotUpdate({ file, server }) {
      if (!(file.endsWith(".md") && file.includes(contentDir))) {
        return;
      }

      server.config.logger.info(`Content changed: ${file}`, { timestamp: true });

      try {
        await buildDevIndex(server);
        server?.ws.send({ type: "full-reload" });
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }

        server.config.logger.error("Failed to rebuild index:", { timestamp: true, error });
      }
    },
  };
}

function fileToUrl(file: string, contentDir: string) {
  // Normalize contentDir to have a trailing slash for consistent replacement
  const normalizedDir = contentDir.endsWith("/") ? contentDir : contentDir + "/";

  return (
    "/" +
    file
      .replace(normalizedDir, "")
      .replace(/\.md$/, "")
      .replace(/\/index$/, "")
      .replace(/^index$/, "")
  );
}

function stripMarkdown(value: string) {
  return (
    value
      // Remove frontmatter (already handled by gray-matter, but just in case)
      .replace(/^---[\s\S]*?---\n?/, "")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code
      .replace(/`[^`]+`/g, "")
      // Convert links to just text
      .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
      // Remove images
      .replace(/!\[[^\]]*]\([^)]+\)/g, "")
      // Remove headings markers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove emphasis markers
      .replace(/[*_~`]/g, "")
      // Remove blockquote markers
      .replace(/^>\s*/gm, "")
      // Remove list markers
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      // Remove horizontal rules
      .replace(/^-{3,}$/gm, "")
      .replace(/^\*{3,}$/gm, "")
      // Remove table formatting
      .replace(/\|/g, " ")
      // Collapse multiple spaces and newlines
      .replace(/\n{2,}/g, "\n")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

function getMimeType(path: string) {
  if (path.endsWith(".js")) {
    return "application/javascript";
  }

  if (path.endsWith(".json")) {
    return "application/json";
  }

  if (path.endsWith(".wasm")) {
    return "application/wasm";
  }

  if (path.endsWith(".pf_meta")) {
    return "application/octet-stream";
  }

  if (path.endsWith(".pf_fragment")) {
    return "application/octet-stream";
  }

  if (path.endsWith(".pf_index")) {
    return "application/octet-stream";
  }

  return "application/octet-stream";
}
