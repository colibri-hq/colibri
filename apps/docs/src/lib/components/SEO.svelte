<script lang="ts">
  import type { PageMetadata } from '$lib/content/content';

  type Props = {
    metadata: PageMetadata;
    url: string;
    image?: string;
    dateModified?: string;
  };

  const {
    metadata,
    url,
    image,
    dateModified,
  }: Props = $props();
  const { title, description, tags, date: datePublished } = $derived(metadata);
  const type = $derived(metadata.layout === 'page' ? 'article' : 'website');
  const fullTitle = $derived(`${title} · Colibri Documentation`);
  const mdUrl = $derived((url.endsWith('/') ? url.slice(0, -1) : url) + '.md');
  const jsonUrl = $derived((url.endsWith('/') ? url.slice(0, -1) : url) + '.json');
</script>

<svelte:head>
  <!-- Primary Meta Tags -->
  <title>{fullTitle}</title>
  <meta name="title" content={fullTitle} />
  <meta name="description" content={description} />

  {#if tags && tags.length > 0}
    <meta name="keywords" content={tags.join(', ')} />
  {/if}

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content={type} />
  <meta property="og:url" content={url} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:site_name" content="Colibri Documentation" />

  {#if image}
    <meta property="og:image" content={image} />
  {/if}

  <!-- Twitter -->
  <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
  <meta name="twitter:url" content={url} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />

  {#if image}
    <meta name="twitter:image" content={image} />
  {/if}

  <!-- Article metadata -->
  {#if type === 'article'}
    {#if datePublished}
      <meta property="article:published_time" content={datePublished} />
    {/if}

    {#if dateModified}
      <meta property="article:modified_time" content={dateModified} />
    {/if}

    {#each tags ?? [] as tag, index (index)}
      <meta property="article:tag" content={tag} />
    {/each}
  {/if}

  <!-- Canonical URL -->
  <link rel="canonical" href={url} />
  <link rel="alternate" type="text/markdown" href={mdUrl} />
  <link rel="alternate" type="application/json" href={jsonUrl} />
</svelte:head>
