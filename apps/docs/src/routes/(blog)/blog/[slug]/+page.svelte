<script lang="ts">
  import type { PageProps } from './$types.js';
  import { page } from '$app/state';
  import { BlogJsonLd, BlogSEO, RelatedPosts } from '$lib/components/blog';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { resolve } from '$app/paths';
  import LateralNavigation from '$lib/components/LateralNavigation.svelte';
  import PostHeader from './PostHeader.svelte';
  import SeriesNavigation from './SeriesNavigation.svelte';
  import Giscus from '$lib/components/Giscus.svelte';

  const { data }: PageProps = $props();
  const metadata = $derived(data.post.metadata);
  const Content = $derived(data.post.content);

  const breadcrumbs = $derived([
    { title: 'Blog', href: resolve('/(blog)/blog') },
    { title: metadata.title, href: resolve('/(blog)/blog/[slug]', { slug: data.post.urlSlug }) },
  ]);

  const jsonLdBreadcrumbs = $derived(
    breadcrumbs.map((item) => ({
      name: item.title,
      url: new URL(item.href, page.url.origin).toString(),
    })),
  );

  const previous = $derived(data.adjacent.previous ? {
    title: data.adjacent.previous.metadata.title,
    href: data.adjacent.previous.slug,
  } : undefined);
  const next = $derived(data.adjacent.next ? {
    title: data.adjacent.next.metadata.title,
    href: data.adjacent.next.slug,
  } : undefined);
</script>

<BlogSEO {metadata} author={data.author} url={page.url.href} />
<BlogJsonLd
  {metadata}
  author={data.author}
  url={page.url.href}
  breadcrumbs={jsonLdBreadcrumbs}
/>

<article class="max-w-4xl mx-auto scroll-m-24" id="top">
  <Breadcrumbs items={breadcrumbs} />
  <PostHeader {metadata} author={data.author} class="mt-4 mb-8" />

  <Content />

  {#if metadata.series && data.seriesPosts.length > 1}
    <SeriesNavigation post={data.post} posts={data.seriesPosts} series={metadata.series} />
  {/if}

  <LateralNavigation {previous} {next} />
  <RelatedPosts posts={data.relatedPosts} />
  <Giscus />
</article>
