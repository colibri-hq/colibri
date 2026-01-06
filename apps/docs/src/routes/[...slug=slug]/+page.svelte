<script lang="ts">
  import { page } from '$app/state';
  import PageHeader from '$lib/components/page/PageHeader.svelte';
  import PageContent from '$lib/components/page/PageContent.svelte';
  import PageFooter from '$lib/components/page/PageFooter.svelte';
  import { getBreadcrumbs } from '$lib/content/content';
  import type { PageProps } from './$types.js';
  import { siteConfig } from '$root/site.config';

  const { data }: PageProps = $props();
  const title = $derived(data.metadata?.title ?? 'Untitled Page');
  const description = $derived(data.metadata?.description ?? '');
  const Content = $derived(data.content);
  const metadata = $derived(data.metadata ?? {});
  const siblings = $derived(data.siblings);

  // Get breadcrumbs for navigation
  const breadcrumbs = $derived(getBreadcrumbs(data.slug));

  // Build breadcrumbs for JSON-LD (with full URLs)
  const jsonLdBreadcrumbs = $derived.by(() => {
    const crumbs = breadcrumbs.map((item) => ({
      name: item.title,
      url: `${siteConfig.site.url}${item.href}`,
    }));

    crumbs.push({ name: title, url: new URL(page.url.pathname, siteConfig.site.url).toString() });

    return crumbs;
  });
</script>

<article class="flex flex-col gap-4 scroll-m-24" id="top">
  <PageHeader {title} {description} {breadcrumbs} readingTime={metadata.readingTime} />

  <PageContent {metadata} breadcrumbs={jsonLdBreadcrumbs}>
    <Content />
  </PageContent>

  <PageFooter {metadata} {siblings} />
</article>
