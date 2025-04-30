<script lang="ts">
  import { default as AuthorLink } from '$lib/components/Links/Author.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
</script>

<article>
  <header class="mb-8">
    <h1 class="text-4xl font-bold">Authors</h1>
  </header>

  <ul class="grid grid-cols-3 gap-4">
    {#each data.authors as author, index (index)}
      <AuthorLink {author} />
    {/each}
  </ul>
</article>
