<script lang="ts">
  import type { BlogPostMetadata } from "$lib/content/blog";
  import type { AuthorWithGravatar } from "$lib/content/author";

  type Breadcrumb = {
    name: string;
    url: string;
  };

  type Props = {
    metadata: BlogPostMetadata;
    author: AuthorWithGravatar;
    url: string;
    breadcrumbs?: Breadcrumb[];
  };

  const { metadata, author, url, breadcrumbs }: Props = $props();

  const blogPosting = $derived({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: metadata.title,
    description: metadata.description,
    url,
    datePublished: metadata.date,
    dateModified: metadata.date,
    author: {
      "@type": "Person",
      name: author.name,
      ...(author.gravatarUrl && { image: author.gravatarUrl }),
    },
    publisher: {
      "@type": "Organization",
      name: "Colibri",
      url: PACKAGE_HOMEPAGE_URL,
      logo: {
        "@type": "ImageObject",
        url: new URL("/logo.svg", PACKAGE_HOMEPAGE_URL).toString(),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    ...(metadata.heroImage && { image: metadata.heroImage }),
    ...(metadata.tags?.length && { keywords: metadata.tags.join(", ") }),
    inLanguage: "en",
    isAccessibleForFree: true,
  });

  const breadcrumbList = $derived.by(() => {
    if (!breadcrumbs || breadcrumbs.length === 0) {
      return null;
    }

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map(({ name, url: item }, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name,
        item,
      })),
    };
  });
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD is safe, data is from our own props -->
  {@html `<script type="application/ld+json">${JSON.stringify(blogPosting)}<\/script>`}
  {#if breadcrumbList}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD is safe, data is from our own props -->
    {@html `<script type="application/ld+json">${JSON.stringify(breadcrumbList)}<\/script>`}
  {/if}
</svelte:head>
