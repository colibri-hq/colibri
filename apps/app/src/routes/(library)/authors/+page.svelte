<script lang="ts">
  import { default as AuthorLink } from '$lib/components/Links/Author.svelte';
  import type { PageData } from './$types';
	import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<article>
  <header class="mb-8">
    <h1 class="text-4xl font-bold">Authors</h1>
  </header>

  <ul class="grid grid-cols-3 gap-4">
    {#each data.authors as creator, index (index)}
      <AuthorLink {creator} />
    {/each}
  </ul>
</article>
