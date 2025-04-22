<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { Icon, NavigationLink, NavigationSection } from '@colibri-hq/ui';
  import AddCollectionForm from '$lib/components/Sidebar/AddCollectionForm.svelte';
  import type { Collection } from '@colibri-hq/sdk';
  import type { MaybePromise } from '@colibri-hq/shared';
  import LoadingSpinner from '$lib/LoadingSpinner.svelte';

  interface Props {
    collections?: MaybePromise<Collection[]>;
  }

  let { collections = [] }: Props = $props();
  let adding: boolean = $state(false);

  function handleAdd() {
    adding = true;
  }

  async function handleAdded(event: CustomEvent<{ created: boolean }>) {
    const { created } = event.detail;

    adding = false;

    if (created) {
      await invalidateAll();
    }
  }
</script>

<NavigationSection label="Collections" initialOpen>
  {#await collections}
    <NavigationLink inert title="Loading collections…">
      {#snippet icon()}
        <LoadingSpinner size={16} />
      {/snippet}
    </NavigationLink>
  {:then collections}
    {#each collections as collection}
      <NavigationLink
        to="/collections/{collection.id}"
        title={collection.name}
        emoji={collection.emoji ?? undefined}
      >
        <div class="flex w-full items-center justify-between">
          <span>{collection.name}</span>

          {#if !collection.shared}
            <Icon
              name="visibility_off"
              class="text-lg text-gray-400 group-aria-[current=page]/link:text-gray-400 dark:text-gray-600"
            />
          {/if}
        </div>
      </NavigationLink>
    {/each}

    {#if adding}
      <li>
        <AddCollectionForm on:done={handleAdded} />
      </li>
    {:else}
      <NavigationLink icon="add" onClick={handleAdd} title="New collection" />
    {/if}
  {/await}
</NavigationSection>
