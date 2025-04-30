<script lang="ts">
  import type { PageData } from './$types';
  import PaginatedList from '$lib/components/Pagination/PaginatedList.svelte';
  import CreatorLink from '$lib/components/Links/CreatorLink.svelte';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let creators = $derived(data.creators);
</script>

<article>
  <header class="mb-4">
    <h1 class="font-serif text-3xl font-bold">Creators</h1>
    <p class="mt-1 text-sm text-gray-500">
      On this page, you can discover the creators behind the books in your
      library.
    </p>
  </header>

  <PaginatedList data={creators}>
    {#snippet children({ items })}
      <ul class="grid grid-cols-3 gap-4">
        {#each items as creator, index (index)}
          <li>
            <CreatorLink {creator} />
          </li>
        {/each}
      </ul>
    {/snippet}
  </PaginatedList>
</article>
