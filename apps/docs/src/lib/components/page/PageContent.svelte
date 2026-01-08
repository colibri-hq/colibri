<script lang="ts">
  import type { Snippet } from 'svelte';
  import SEO from '$lib/components/SEO.svelte';
  import { TableOfContents } from '$lib/components/content';
  import type { PageMetadata } from '$lib/content/content';
  import { page } from '$app/state';
  import { JsonLd } from '$lib/components/page';

  type Breadcrumb = {
    name: string;
    url: string;
  };

  type Props = {
    dateModified?: string;
    breadcrumbs?: Breadcrumb[];
    metadata: PageMetadata;
    children: Snippet;
    showToc?: boolean;
  };

  const {
    dateModified,
    breadcrumbs,
    metadata,
    children,
    showToc = true,
  }: Props = $props();
</script>

<SEO {metadata} url={page.url.href} {dateModified} />

<JsonLd
  {metadata}
  url={page.url.href}
  {dateModified}
  {breadcrumbs}
/>

<div class="w-full xl:grid xl:grid-cols-[1fr_minmax(0,64rem)_1fr] xl:px-4">
  <div class="hidden xl:block"></div>

  <div class="w-full max-w-5xl mx-auto px-4 mb-8 xl:px-0">
    {@render children()}
  </div>

  {#if showToc && metadata.headings?.length}
    <aside class="hidden xl:block xl:ps-8">
      <div class="sticky top-16 max-h-[calc(100vh-4rem)] pt-4 overflow-y-auto w-64">
        <TableOfContents headings={metadata.headings} />
      </div>
    </aside>
  {/if}
</div>
