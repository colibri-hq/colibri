<script lang="ts" module>
  import type { PageData } from './$types';

  export type Catalog = Awaited<PageData['catalogs']>[number];
</script>

<script lang="ts">
  import ContentSection from '$lib/components/ContentSection.svelte';
  import CatalogNavigation from './CatalogNavigation.svelte';
  import type { PageProps } from './$types';
  import type { Snippet } from 'svelte';

  let { data, children }: PageProps & { children?: Snippet } = $props();
  let catalogs = $derived(data.catalogs);
</script>

<ContentSection padding>
  <div class="relative flex items-stretch">
    <CatalogNavigation {catalogs} />

    <div class="ml-8 w-4/5 shrink-0">
      {@render children?.()}
    </div>
  </div>
</ContentSection>
