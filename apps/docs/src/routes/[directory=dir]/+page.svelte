<script lang="ts">
  import { page } from '$app/state';
  import PageContent from '$lib/components/page/PageContent.svelte';
  import PageHeader from '$lib/components/page/PageHeader.svelte';
  import PageFooter from '$lib/components/page/PageFooter.svelte';
  import type { PageProps } from './$types.js';
  import { type PageMetadata, getBreadcrumbs } from '$lib/content/content';
  import ChildPageNavigation from './ChildPageNavigation.svelte';
  import { siteConfig } from '$root/site.config';

  const { data }: PageProps = $props();
  const IndexContent = $derived(data.indexContent);
  const metadata = $derived<PageMetadata>(data.indexMetadata ?? {
    title: data.title,
    slug: data.slug,
    description: data.description ?? '',
    date: new Date().toDateString(),
    categories: [],
  });
  const siblings = $derived(data.siblings);

  // Get breadcrumbs for navigation
  const breadcrumbs = $derived(getBreadcrumbs(data.slug));

  // Build breadcrumbs for JSON-LD (with full URLs)
  const jsonLdBreadcrumbs = $derived.by(() => {
    const crumbs = breadcrumbs.map((item) => ({
      name: item.title,
      url: `${siteConfig.site.url}${item.href}`,
    }));

    crumbs.push({ name: data.title, url: new URL(page.url.pathname, siteConfig.site.url).toString() });

    return crumbs;
  });

  const children = $derived(data.children ?? []);
</script>

<article class="flex flex-col gap-4">
  <PageHeader title={metadata.title} description={metadata.description} {breadcrumbs} readingTime={metadata.readingTime} />

  {#if IndexContent}
    <PageContent {metadata} breadcrumbs={jsonLdBreadcrumbs}>
      <IndexContent />
    </PageContent>
  {/if}

  <ChildPageNavigation {children} />

  <PageFooter {metadata} {siblings} />
</article>
