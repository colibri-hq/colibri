<script lang="ts">
  import { page } from '$app/state';
  import { PageContent, PageFooter, PageHeader } from '$lib/components/page';
  import { getBreadcrumbs } from '$lib/content/content';
  import type { PageProps } from './$types.js';
  import { PUBLIC_SITE_URL } from '$env/static/public';

  const { data }: PageProps = $props();
  const title = $derived(data.metadata?.title ?? 'Untitled Page');
  const description = $derived(data.metadata?.description ?? '');
  const Content = $derived(data.content);
  const metadata = $derived(data.metadata ?? {});
  const siblings = $derived(data.siblings);
  const breadcrumbs = $derived(getBreadcrumbs(data.slug));
  const jsonLdBreadcrumbs = $derived([
    ...breadcrumbs,
    { title: data.metadata.title, href: page.url.pathname },
  ].map(({ href, title: name }) => ({
    url: new URL(href, PUBLIC_SITE_URL).toString(),
    name,
  })));
</script>

<article class="flex flex-col gap-4 scroll-m-24" id="top">
  <PageHeader
    {title}
    {description}
    {breadcrumbs}
    readingTime={metadata.readingTime}
  />

  <PageContent {metadata} breadcrumbs={jsonLdBreadcrumbs}>
    <Content />
  </PageContent>

  <PageFooter {metadata} {siblings} />
</article>
