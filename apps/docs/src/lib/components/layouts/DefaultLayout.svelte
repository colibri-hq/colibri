<script module>
  export {
    a,
    blockquote,
    Callout,
    code,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    hr,
    img,
    li,
    ol,
    p,
    pre,
    strong,
    table,
    td,
    th,
    tr,
    ul,
  } from '../markdown/index.js';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { PageMetadata } from '$lib/content/content';

  type Props = PageMetadata & {
    children: Snippet;
  };

  const { children, title, description, date, tags, relevance, layout, slug, ...rest }: Props = $props();
  const topic = $derived(slug?.split('/').filter(Boolean)[0] ?? 'docs');
  const kind = $derived(layout === 'blog' ? 'blog' : layout === 'docs' ? 'kb' : 'page');
  const dateNumeric = $derived(date ? parseInt(date.replace(/-/g, ''), 10) : 0);
  const relevanceScore = $derived(relevance ?? 50);
</script>

<div
  {...rest}
  data-pagefind-body
  data-pagefind-meta="title:{title}, description:{description}"
  class="w-full"
>
  <!-- Pagefind filters -->
  <span data-pagefind-filter="kind:{kind}" class="hidden"></span>
  <span data-pagefind-filter="topic:{topic}" class="hidden"></span>

  {#each tags ?? [] as tag, index (index)}
    <span data-pagefind-filter="tag:{tag}" class="hidden"></span>
  {/each}

  <!-- Pagefind sort values -->
  <span data-pagefind-sort="date:{dateNumeric}" class="hidden"></span>
  <span data-pagefind-sort="relevance:{relevanceScore}" class="hidden"></span>

  {@render children()}
</div>
