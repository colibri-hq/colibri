<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { Icon, NavigationLink, NavigationSection } from '@colibri-hq/ui';
  import AddCollectionForm from '$lib/components/Sidebar/AddCollectionForm.svelte';
  import type { Collection } from '@colibri-hq/sdk/types';
  import type { MaybePromise } from '@colibri-hq/shared';
  import LoadingSpinner from '$lib/LoadingSpinner.svelte';
  import { trpc } from '$lib/trpc/client';
  import { error, info, success } from '$lib/notifications';

  interface Props {
    collections?: MaybePromise<Collection[]>;
  }

  let { collections = [] }: Props = $props();
  let adding: boolean = $state(false);
  let dragOverId: string | null = $state(null);

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

  function handleDragOver(event: DragEvent, collectionId: string) {
    if (!event.dataTransfer?.types.includes('application/x-colibri-work')) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    dragOverId = collectionId;
  }

  function handleDragLeave() {
    dragOverId = null;
  }

  async function handleDrop(event: DragEvent, collection: Collection) {
    event.preventDefault();
    dragOverId = null;

    const data = event.dataTransfer?.getData('application/x-colibri-work');
    if (!data) {
      return;
    }

    try {
      const { workId, title } = JSON.parse(data);

      const result = await trpc(page).collections.toggleBook.mutate({
        collection: collection.id.toString(),
        book: workId,
      });

      if (result.added) {
        success(`Added "${title}" to ${collection.name}`);
      } else {
        info(`"${title}" was already in ${collection.name}`);
      }

      await invalidateAll();
    } catch {
      error('Failed to add work to collection');
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
    {#each collections as collection, index (index)}
      <div
        role="listitem"
        ondragover={(e) => handleDragOver(e, collection.id.toString())}
        ondragleave={handleDragLeave}
        ondrop={(e) => handleDrop(e, collection)}
        class="transition-colors duration-150 {dragOverId === collection.id.toString()
          ? 'rounded-lg bg-primary-100 ring-2 ring-primary-500 dark:bg-primary-900/50'
          : ''}"
      >
        <NavigationLink
          to="/collections/{collection.id}"
          title={collection.name}
          icon={collection.icon ?? undefined}
        >
          <div class="flex w-full items-center justify-between">
            <span>{collection.name}</span>

            {#if collection.shared === false}
              <Icon
                name="lock"
                class="text-lg text-gray-400 group-aria-[current=page]/link:text-gray-400 dark:text-gray-600"
              />
            {:else if collection.shared === true}
              <Icon
                name="public"
                class="text-lg text-gray-400 group-aria-[current=page]/link:text-gray-400 dark:text-gray-600"
              />
            {/if}
          </div>
        </NavigationLink>
      </div>
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
