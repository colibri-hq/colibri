<script lang="ts">
  import { page } from '$app/state';
  import { PageContent, PageFooter, PageHeader } from '$lib/components/page';
  import type { PageProps } from './$types.js';
  import { getBreadcrumbs, type PageMetadata } from '$lib/content/content';
  import ChildPageNavigation from './ChildPageNavigation.svelte';
  import { PUBLIC_SITE_URL } from '$env/static/public';

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
  const breadcrumbs = $derived(getBreadcrumbs(data.slug));
  const jsonLdBreadcrumbs = $derived([
    ...breadcrumbs,
    { title: data.title, href: page.url.pathname },
  ].map(({ href, title: name }) => ({
    url: new URL(href, PUBLIC_SITE_URL).toString(),
    name,
  })));

  const children = $derived(data.children ?? []);
</script>

<article class="flex flex-col gap-4">
  <PageHeader
    title={metadata.title}
    description={metadata.description} {breadcrumbs}
    readingTime={metadata.readingTime}
  />

  {#if IndexContent}
    <PageContent {metadata} breadcrumbs={jsonLdBreadcrumbs}>
      <IndexContent />
    </PageContent>
  {/if}

  <ChildPageNavigation {children} />
  <PageFooter {metadata} {siblings} />
</article>
