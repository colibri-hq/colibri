import type { WebAppManifest } from "web-app-manifest";
import type { RequestHandler } from "./$types";

export const GET = async function handle({ url }) {
  const manifest = {
    name: "Colibri",
    short_name: "Colibri",
    display: "minimal-ui",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    theme_color: "#EDEBE4",
    background_color: "#EDEBE4",
    dir: "ltr",
    id: new URL("/", url.origin).toString(),
    start_url: new URL("/", url.origin).toString(),
  } satisfies WebAppManifest;

  return new Response(JSON.stringify(manifest), {
    headers: { "content-type": "application/manifest+json" },
  });
} satisfies RequestHandler;

// TODO: This route should be prerendered, but that is blocked by the server
//       hook injecting the database, which requires reading the database URL
//       from the environment variables. Doing so would require building the
//       app against a specific database URL, which is probably not what we want
//       to do.
export const prerender = false;
