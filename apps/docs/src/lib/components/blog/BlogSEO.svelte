<script lang="ts">
  import type { BlogPostMetadata } from "$lib/content/blog";
  import type { AuthorWithGravatar } from "$lib/content/author";

  type Props = {
    metadata: BlogPostMetadata;
    author: AuthorWithGravatar;
    url: string;
  };

  const { metadata, author, url }: Props = $props();
  const mdUrl = $derived((url.endsWith('/') ? url.slice(0, -1) : url) + '.md');
  const jsonUrl = $derived((url.endsWith('/') ? url.slice(0, -1) : url) + '.json');
</script>

<svelte:head>
  <title>{metadata.title} | Colibri Blog</title>
  <meta name="description" content={metadata.description} />
  <link rel="canonical" href={url} />
  <link rel="alternate" type="text/markdown" href={mdUrl} />
  <link rel="alternate" type="application/json" href={jsonUrl} />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content={metadata.title} />
  <meta property="og:description" content={metadata.description} />
  <meta property="og:url" content={url} />
  {#if metadata.heroImage}
    <meta property="og:image" content={metadata.heroImage} />
  {/if}

  <!-- Article-specific -->
  <meta property="article:published_time" content={metadata.date} />
  <meta property="article:author" content={author.name} />
  {#each metadata.tags ?? [] as tag (tag)}
    <meta property="article:tag" content={tag} />
  {/each}

  <!-- Twitter -->
  <meta name="twitter:card" content={metadata.heroImage ? "summary_large_image" : "summary"} />
  <meta name="twitter:title" content={metadata.title} />
  <meta name="twitter:description" content={metadata.description} />
  {#if metadata.heroImage}
    <meta name="twitter:image" content={metadata.heroImage} />
  {/if}
</svelte:head>
