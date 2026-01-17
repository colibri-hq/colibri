declare module "statue-ssg/cms/content-processor.js" {
  export type SiteConfig = {
    site: {
      name: string;
      url: `http://${string}` | `https://${string}`;
      description?: string;
      author?: string;
    };
    contact?: {
      email?: `${string}@${string}`;
      privacyEmail?: `${string}@${string}`;
      supportEmail?: `${string}@${string}`;
      phone?: string;
      address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
      };
    };
    social?: {
      twitter?: `https://twitter.com/${string}`;
      github?: `https://github.com/${string}`;
      linkedin?: `https://linkedin.com/company/${string}`;
      facebook?: `https://facebook.com/${string}`;
      instagram?: `https://instagram.com/${string}`;
      youtube?: `https://youtube.com/@${string}`;
      discord?: `https://discord.gg/${string}`;
      reddit?: `https://reddit.com/r/${string}`;
    };
    legal?: {
      privacyPolicyLastUpdated?: string;
      termsLastUpdated?: string;
      isCaliforniaCompliant?: boolean;
      doNotSell?: { processingTime?: string; confirmationRequired?: boolean };
    };
    search?: {
      enabled: boolean;
      placeholder?: string;
      noResultsText?: string;
      debounceMs?: number;
      minQueryLength?: number;
      maxResults?: number;
      showCategories?: boolean;
      showDates?: boolean;
      showExcerpts?: boolean;
      excerptLength?: number;
    };
    seo?: {
      defaultTitle?: string;
      titleTemplate?: string;
      defaultDescription?: string;
      keywords?: string[];
      ogImage?: `http://${string}` | `https://${string}` | `/${string}`;
      twitterCard?: string;
    };
  };

  export function scanContentDirectory(): ContentEntry[];

  export function getContentDirectories(): ContentDirectory[];

  export function truncateContent(content: string): string;

  export function formatTitle(title: string): string;

  export function getAllContent(): ContentEntry[];

  export function getContentByUrl(url: string);

  export function getContentByDirectory(directory: string): ContentEntry[];

  export function clearContentCache(): void;

  export function getSubDirectories(directory: string): ContentDirectory[];

  export function processTemplateVariables(content: string): string;

  export function getSidebarTree(directory: string): SidebarItem[];

  export function getAllDirectoriesSidebar(): SidebarItem[];

  type SidebarItem = { title: string; url?: string; order?: number; children?: SidebarItem[] };

  type ContentDirectory = { name: string; path: string; title: string; url: string };

  type ContentEntry = {
    slug: string;
    path: string;
    url: string;
    directory: string;
    mainDirectory: string;
    depth: number;
    content: string;
    metadata: { title: string; description: string; date: string; author: string } & Record<
      string,
      unknown
    >;
  };
}

declare module "*.md" {
  import type { SvelteComponent } from "svelte";

  export default class Comp extends SvelteComponent {}

  export const metadata: Record<string, unknown>;
}

declare module "*.json" {
  const value: any;
  export default value;
}
