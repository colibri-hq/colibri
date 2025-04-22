<script lang="ts" module>
  import type { PageData } from './$types';

  export type Catalog = Awaited<PageData['catalogs']>[0][number];
</script>

<script lang="ts">
  import Tabs from '$lib/components/Tabs.svelte';
  import Tab from '$lib/components/Tab.svelte';
  import InstanceSettings from './InstanceSettings.svelte';
  import PersonalSettings from './PersonalSettings.svelte';
  import CatalogSettings from './CatalogSettings.svelte';
  import { page } from '$app/state';
  import SharingSettings from './SharingSettings.svelte';
  import { goto } from '$app/navigation';
  import { removePaginationParametersFromUrl } from '$lib/trpc/client';

  type Slug = (typeof tabs)[number]['slug'];
  const queryParamName = 'tab';
  const tabs = [
    {
      title: 'Personal',
      slug: 'personal',
      component: PersonalSettings,
    },
    {
      title: 'Instance',
      slug: 'instance',
      component: InstanceSettings,
    },
    {
      title: 'Catalogs',
      slug: 'catalogs',
      component: CatalogSettings,
    },
    {
      title: 'Sharing',
      slug: 'sharing',
      component: SharingSettings,
    },
  ];

  let initialActive: Slug = $derived(
    (page.url.searchParams.get(queryParamName) as Slug) ?? 'personal',
  );

  function updateUrl(tab: string) {
    return () => {
      const newUrl = new URL(page.url);

      // Remove the pagination query parameters once the user navigates away from the tab—we don't
      // want to mess up another page's pagination.
      removePaginationParametersFromUrl(newUrl);
      newUrl?.searchParams?.set(queryParamName, tab);
      goto(newUrl);
    };
  }
</script>

<article>
  <header class="mb-8">
    <h1 class="text-4xl font-bold">Settings</h1>
  </header>

  <Tabs>
    {#each tabs as { title: titleText, slug, component }}
      <Tab onActivate={updateUrl(slug)} open={initialActive === slug}>
        {#snippet title()}
          <span>{titleText}</span>
        {/snippet}
        {@const SvelteComponent = component}
        <SvelteComponent />
      </Tab>
    {/each}
  </Tabs>
</article>
