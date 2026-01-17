<script lang="ts">
  import type { PageMetadata } from '$lib/content/content';

  type Breadcrumb = {
    name: string;
    url: string;
  };

  type Props = {
    metadata: PageMetadata;
    url: string;
    dateModified?: string;
    breadcrumbs?: Breadcrumb[];
  };

  const {
    url,
    dateModified,
    metadata,
    breadcrumbs,
  }: Props = $props();

  const { title, description, tags, date: datePublished } = $derived(metadata);
  const techArticle = $derived({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: title,
    description,
    url,
    datePublished,
    dateModified,
    author: {
      '@type': 'Organization',
      name: 'Colibri',
      url: PACKAGE_HOMEPAGE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Colibri',
      url: PACKAGE_HOMEPAGE_URL,
      logo: {
        '@type': 'ImageObject',
        url: new URL('/logo.svg', PACKAGE_HOMEPAGE_URL).toString(),
      },
    },
    keywords: tags?.join(', '),
    inLanguage: 'en',
    isAccessibleForFree: true,
  });
  const breadcrumbList = $derived.by(() => {
    if (!breadcrumbs || breadcrumbs.length === 0) {
      return null;
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map(({ name, url: item }, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name,
        item,
      })),
    };
  });

</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD is safe, data is from our own props -->
  {@html `<script type="application/ld+json">${JSON.stringify(techArticle)}<\/script>`}
  {#if breadcrumbList}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD is safe, data is from our own props -->
    {@html `<script type="application/ld+json">${JSON.stringify(breadcrumbList)}<\/script>`}
  {/if}
</svelte:head>
