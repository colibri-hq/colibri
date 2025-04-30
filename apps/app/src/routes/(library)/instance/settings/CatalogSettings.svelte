<script lang="ts">
  import type { MaybePromise } from '@colibri-hq/shared';
  import type { Catalog } from './+page.svelte';
  import { Button } from '@colibri-hq/ui';
  import AddCatalogModal from './AddCatalogModal.svelte';
  import { type PaginationData, trpc } from '$lib/trpc/client';
  import { page } from '$app/stores';
  import CatalogListItem, {
    type DisableCatalogEvent,
    type EnableCatalogEvent,
  } from './CatalogListItem.svelte';
  import PaginatedList from '$lib/components/Pagination/PaginatedList.svelte';

  let data: MaybePromise<[Catalog[], PaginationData]> = $derived(
    $page.data.catalogs,
  );

  let catalogModalOpen = $state(false);
  let catalogsLoading: Catalog['id'][] = [];

  async function enableCatalog({ detail: { catalog } }: EnableCatalogEvent) {
    catalogsLoading.push(catalog.id);

    try {
      await trpc($page).catalogs.enable.mutate({
        id: catalog.id,
      });
    } finally {
      catalogsLoading = catalogsLoading.filter((id) => id !== catalog.id);
    }
  }

  async function disableCatalog({ detail: { catalog } }: DisableCatalogEvent) {
    catalogsLoading.push(catalog.id);

    try {
      await trpc($page).catalogs.disable.mutate({
        id: catalog.id,
      });
    } finally {
      catalogsLoading = catalogsLoading.filter((id) => id !== catalog.id);
    }
  }

  function isLoading(catalog: Catalog) {
    return catalogsLoading.includes(catalog.id);
  }

  function showCatalogModal() {
    catalogModalOpen = true;
  }
</script>

<section>
  <header
    class="mb-8 flex flex-col items-center justify-between md:mb-4 md:flex-row"
  >
    <div>
      <h3 class="mb-2 font-serif text-3xl font-bold">Catalogs</h3>
      <p class="text-gray-700 dark:text-gray-400">
        Here you can find all the catalogs that are available in the system.
      </p>
    </div>

    <Button class="mt-4 mr-auto md:mt-0 md:mr-0" onClick={showCatalogModal}>
      Add new catalog
    </Button>
  </header>

  <PaginatedList {data}>
    {#snippet children({ items })}
      <ul class="space-y-4">
        {#each items as catalog, index (index)}
          <CatalogListItem
            {catalog}
            disabled={isLoading(catalog)}
            on:enable={enableCatalog}
            on:disable={disableCatalog}
          />
        {/each}
      </ul>
    {/snippet}
  </PaginatedList>
</section>

<AddCatalogModal bind:open={catalogModalOpen} />
