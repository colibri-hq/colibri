import { building } from "$app/environment";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export type GitHubRelease = {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
};

export const load: PageServerLoad = async ({ fetch }) => {
  // Only fetch during production builds, return empty in dev
  if (!building) {
    return { releases: [] as GitHubRelease[] };
  }

  try {
    const response = await fetch("https://api.github.com/repos/colibri-hq/colibri/releases", {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch GitHub releases: ${response.status} ${response.statusText}`);
      return { releases: [] as GitHubRelease[] };
    }

    const releases: GitHubRelease[] = await response.json();

    // Filter out drafts and limit to 50 releases
    const publishedReleases = releases.filter((release) => !release.draft).slice(0, 50);

    return { releases: publishedReleases };
  } catch (error) {
    console.warn("Failed to fetch GitHub releases:", error);
    return { releases: [] as GitHubRelease[] };
  }
};
