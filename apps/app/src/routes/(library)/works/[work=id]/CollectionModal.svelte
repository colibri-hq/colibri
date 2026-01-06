<script lang="ts" module>
  import type { RouterOutputs } from '$lib/trpc/router';

  type Collection = RouterOutputs['collections']['list'][number];
</script>

<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { IconRenderer, Modal } from '@colibri-hq/ui';
  import { savable, trpc } from '$lib/trpc/client';
  import type { Work } from '@colibri-hq/sdk/types';
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  interface Props {
    open?: boolean;
    loading?: boolean;
    work: Pick<Work, 'id'>;
  }

  let {
    open = $bindable(false),
    loading = $bindable(false),
    work,
  }: Props = $props();
  let collections: Collection[] = $state([]);

  async function loadCollections() {
    loading = true;

    try {
      collections = await trpc(page).collections.list.query();
    } finally {
      loading = false;
    }
  }

  function addToCollection({ id }: Collection) {
    return async () => {
      loading = true;

      try {
        await trpc(page).collections.toggleBook.mutate(
          savable({
            collection: id,
            book: work.id,
          }),
        );
        await Promise.all([loadCollections(), invalidateAll()]);
      } finally {
        loading = false;
      }
    };
  }

  onMount(loadCollections);
</script>

<Modal bind:open>
  {#snippet header()}
    <header class="mb-4">
      <h2 class="font-bold">Collections</h2>
    </header>
  {/snippet}

  <ul class="w-96">
    {#each collections as collection, index (index)}
      {@const entries = Number(collection.entry_count)}
      <li>
        <button
          class="flex w-full cursor-pointer items-center justify-between rounded-md p-2
          transition outline-none hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:ring
          dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800"
          onclick={addToCollection(collection)}
        >
          <IconRenderer icon={collection.icon} class="mr-2 text-xl" fallback="collections_bookmark" />
          <span class="mr-auto">{collection.name}</span>
          <span class="ml-4 text-sm text-gray-500">
            {#if entries === 0}
              No books yet
            {:else if entries === 1}
              One book
            {:else if entries === 2}
              Two books
            {:else if entries === 3}
              Three books
            {:else}
              {entries} books
            {/if}
          </span>
        </button>
      </li>
    {/each}
  </ul>
</Modal>
