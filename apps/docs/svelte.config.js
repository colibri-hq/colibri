import adapterCloudflare from "@sveltejs/adapter-cloudflare";
import adapterStatic from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { escapeSvelte, mdsvex } from "mdsvex";
import { resolve } from "node:path";
import rehypeMermaid from "rehype-mermaid";
import rehypeSlug from "rehype-slug";
import rehypeUnwrapImages from "rehype-unwrap-images";
import remarkGitHubFlavoredMarkdown from "remark-gfm";
import remarkToc from "remark-toc";
import { getSingletonHighlighter } from "shiki";
import packageJson from "./package.json" with { type: "json" };
import { calloutsPreprocessor } from "./src/lib/preprocessors/callouts.js";
import { footnotesPreprocessor } from "./src/lib/preprocessors/footnotes.js";
import remarkExtractHeadings from "./src/lib/remark/remark-extract-headings.js";
import remarkRemoveDuplicateTitle from "./src/lib/remark/remark-remove-duplicate-title.js";
import caddyfileLang from "./src/lib/shiki/caddyfile.tmLanguage.json" with { type: "json" };

const {
  config: { contentDir, outputDir },
} = packageJson;

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: [".svelte", ".md"],
  preprocess: [
    vitePreprocess(),
    calloutsPreprocessor(),
    footnotesPreprocessor(),
    // @ts-expect-error -- Plugin types are broken
    mdsvex({
      extensions: [".md"],
      layout: {
        blog: resolve(
          import.meta.dirname,
          "src/lib/components/layouts/BlogPostLayout.svelte",
        ),
        _: resolve(
          import.meta.dirname,
          "src/lib/components/layouts/DefaultLayout.svelte",
        ),
      },
      smartypants: true,
      highlight: {
        async highlighter(code, lang = "text", meta) {
          // Skip mermaid blocks - let rehype-mermaid handle them
          if (lang === "mermaid") {
            // Escape HTML entities and Svelte special characters
            const escapedCode = code
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#39;")
              .replace(/\{/g, "&#123;")
              .replace(/\}/g, "&#125;");
            // Return format that rehype-mermaid expects
            return `<pre><code class="language-mermaid">${escapedCode}</code></pre>`;
          }

          // Parse meta string for title and caption (meta can be null/undefined)
          const metaStr = meta || "";
          const titleMatch = metaStr.match(/title="([^"]+)"/);
          const captionMatch = metaStr.match(/caption="([^"]+)"/);
          const title = titleMatch?.[1];
          const caption = captionMatch?.[1];

          const languages = [
            "bash",
            "shell",
            "typescript",
            "javascript",
            "svelte",
            "json",
            "yaml",
            "toml",
            "ini",
            "sql",
            "nginx",
            "markdown",
            "csv",
            "text",
          ];
          const customLanguages = ["caddyfile"];
          // noinspection NpmUsedModulesInstalled
          const highlighter = await getSingletonHighlighter({
            themes: [
              import("shiki/themes/github-light.mjs"),
              import("shiki/themes/github-dark.mjs"),
            ],
            langs: [...languages, caddyfileLang],
          });
          let html = escapeSvelte(
            highlighter.codeToHtml(code, {
              // @ts-expect-error -- Plugin types are broken
              lang: [...languages, ...customLanguages].includes(lang)
                ? lang
                : "text",
              defaultColor: "light-dark()",
              themes: {
                light: "github-light",
                dark: "github-dark",
              },
              transformers: [
                {
                  name: "shiki-container",
                  // @ts-expect-error -- Plugin types are broken
                  root({ children }) {
                    // Only show language badge if no title is provided
                    if (lang && !title) {
                      children.unshift({
                        type: "element",
                        tagName: "span",
                        properties: {
                          className: ["shiki-language"],
                          "data-language": lang,
                        },
                        children: [{ type: "text", value: lang }],
                      });
                    }

                    return {
                      type: "root",
                      children: [
                        {
                          type: "element",
                          tagName: "figure",
                          properties: {
                            className: ["code-block"],
                          },
                          children: [
                            title
                              ? {
                                  type: "element",
                                  tagName: "span",
                                  properties: {
                                    className: ["code-block__title"],
                                  },
                                  children: [
                                    {
                                      type: "text",
                                      value: title,
                                    },
                                  ],
                                }
                              : null,
                            {
                              type: "element",
                              tagName: "div",
                              properties: {
                                className: ["code-block__inner"],
                              },
                              children,
                            },
                            caption
                              ? {
                                  type: "element",
                                  tagName: "figcaption",
                                  properties: {
                                    className: ["code-block__caption"],
                                  },
                                  children: [
                                    {
                                      type: "text",
                                      value: caption,
                                    },
                                  ],
                                }
                              : null,
                          ].filter(Boolean),
                        },
                      ],
                    };
                  },
                },
              ],
            }),
          );

          return `{@html \`${html}\` }`;
        },
      },
      remarkPlugins: [
        remarkRemoveDuplicateTitle,
        remarkExtractHeadings,
        remarkGitHubFlavoredMarkdown,
        // @ts-expect-error -- Plugin types are broken
        [remarkToc, { tight: true, maxDepth: 3 }],
      ],
      rehypePlugins: [
        // @ts-expect-error -- Plugin types are broken
        rehypeSlug,
        // @ts-expect-error -- Plugin types are broken
        rehypeUnwrapImages,
        [
          // @ts-expect-error -- Plugin types are broken
          rehypeMermaid,
          {
            // @ts-expect-error -- Plugin types are broken
            strategy: "inline-svg",
            dark: true,
          },
        ],
      ],
    }),
  ],
  compilerOptions: {
    discloseVersion: true,
    modernAst: true,
  },
  kit: {
    adapter:
      process.env.WORKERS_CI === "1"
        ? adapterCloudflare({
            routes: {
              include: ["/mcp"],
              exclude: ["<all>"],
            },
          })
        : adapterStatic({
            pages: outputDir,
            assets: outputDir,
            precompress: true,
            strict: true,
            fallback: "index.html",
          }),
    env: {
      dir: "../..",
    },
    alias: {
      $content: resolve(import.meta.dirname, contentDir),
      $lib: resolve(import.meta.dirname, "src/lib"),
      $root: import.meta.dirname,
    },
    prerender: {
      origin: process.env.PUBLIC_SITE_URL || "https://docs.colibri.io",
      crawl: true,
      handleHttpError: "warn",
      handleMissingId: "warn",
      handleUnseenRoutes: "warn",
    },
  },
};

export default config;
