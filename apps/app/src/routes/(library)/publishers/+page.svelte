<script lang="ts">
  import { default as PublisherLink } from '$lib/components/Links/Publisher.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
</script>

<article>
  <header class="mb-8">
    <h1 class="text-4xl font-bold">Publishers</h1>
  </header>

  <ul class="grid grid-cols-3 gap-4">
    {#each data.publishers as publisher, index (index)}
      <PublisherLink {publisher} />
    {/each}
  </ul>
</article>
