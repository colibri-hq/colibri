<script lang="ts" module>
  import type { PageData } from './$types';

  export type Catalog = Awaited<PageData['catalogs']>[0][number];
</script>

<script lang="ts">
  import ApiKeysSettings from './ApiKeysSettings.svelte';
  import CatalogSettings from './CatalogSettings.svelte';
  import InstanceSettings from './InstanceSettings.svelte';
  import MemberSettings from './MemberSettings.svelte';
  import MetadataProviders from './MetadataProviders.svelte';
  import PersonalSettings from './PersonalSettings.svelte';
  import SharingSettings from './SharingSettings.svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { removePaginationParametersFromUrl } from '$lib/trpc/client';
  import { Tabs } from '@colibri-hq/ui';

  const tabs = {
    personal: 'Personal',
    apiKeys: 'API Keys',
    instance: 'Instance',
    members: 'Members',
    catalogs: 'Catalogs',
    metadata: 'Metadata',
    sharing: 'Sharing',
  };
  type Slug = keyof typeof tabs;

  const queryParamName = 'tab';
  let initialActive = $derived.by<Slug>(() => {
    const tab = page.url.searchParams.get(queryParamName);

    return isValidTab(tab) ? tab : 'personal';
  });

  function isValidTab(tab: string | null): tab is Slug {
    return Boolean(tab && Object.keys(tabs).includes(tab));
  }

  function updateUrl(tab: Slug) {
    const newUrl = new URL(page.url);

    // Remove the pagination query parameters once the user navigates away
    // from the tab—we don't want to mess up another page's pagination.
    removePaginationParametersFromUrl(newUrl);
    newUrl?.searchParams?.set(queryParamName, tab);

    return goto(newUrl);
  }
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

<article>
  <header class="mb-8">
    <h1 class="text-5xl font-bold font-serif">Settings</h1>
  </header>

  <Tabs
    {tabs}
    initialValue={initialActive}
    onChange={updateUrl}
    lazy
  >
    {#snippet personalContent()}
      <PersonalSettings></PersonalSettings>
    {/snippet}

    {#snippet apiKeysContent()}
      <ApiKeysSettings></ApiKeysSettings>
    {/snippet}

    {#snippet instanceContent()}
      <InstanceSettings></InstanceSettings>
    {/snippet}

    {#snippet membersContent()}
      <MemberSettings></MemberSettings>
    {/snippet}

    {#snippet catalogsContent()}
      <CatalogSettings></CatalogSettings>
    {/snippet}

    {#snippet metadataContent()}
      <MetadataProviders></MetadataProviders>
    {/snippet}

    {#snippet sharingContent()}
      <SharingSettings></SharingSettings>
    {/snippet}
  </Tabs>
</article>
