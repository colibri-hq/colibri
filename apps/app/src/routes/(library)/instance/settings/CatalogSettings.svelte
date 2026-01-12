<script lang="ts">
  import type { MaybePromise } from '@colibri-hq/shared';
  import type { Catalog } from './+page.svelte';
  import { Button } from '@colibri-hq/ui';
  import AddCatalogModal from './AddCatalogModal.svelte';
  import { type PaginationData, trpc } from '$lib/trpc/client';
  import { page } from '$app/state';
  import CatalogListItem, { type CatalogEventDetail } from './CatalogListItem.svelte';
  import PaginatedList from '$lib/components/Pagination/PaginatedList.svelte';
  import SettingsPane from './SettingsPane.svelte';

  let data: MaybePromise<[Catalog[], PaginationData]> = $derived(
    page.data.catalogs,
  );

  let catalogModalOpen = $state(false);
  let catalogsLoading: Catalog['id'][] = [];

  async function enableCatalog({ catalog }: CatalogEventDetail) {
    catalogsLoading.push(catalog.id);

    try {
      await trpc(page).catalogs.enable.mutate({
        id: catalog.id,
      });
    } finally {
      catalogsLoading = catalogsLoading.filter((id) => id !== catalog.id);
    }
  }

  async function disableCatalog({ catalog }: CatalogEventDetail) {
    catalogsLoading.push(catalog.id);

    try {
      await trpc(page).catalogs.disable.mutate({
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

<SettingsPane description="Here you can find all the catalogs that are available in the system.">
  {#snippet actions()}
    <Button onClick={showCatalogModal}>
      Add new catalog
    </Button>
  {/snippet}

  <PaginatedList {data}>
    {#snippet children({ items })}
      <ul class="space-y-4">
        {#each items as catalog, index (index)}
          <CatalogListItem
            {catalog}
            disabled={isLoading(catalog)}
            onenable={enableCatalog}
            ondisable={disableCatalog}
          />
        {/each}
      </ul>
    {/snippet}
  </PaginatedList>
</SettingsPane>

<AddCatalogModal bind:open={catalogModalOpen} />
