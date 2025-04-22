<script lang="ts">
  import Sidebar from '$lib/components/Sidebar/Sidebar.svelte';
  import UploadModal from '$lib/components/Upload/UploadModal.svelte';
  import type { AuthData } from '../+layout.server';
  import type { LayoutData } from './$types';
  import { preference, theme } from '$lib/actions/theme';
  import UploadOverlay from '$lib/components/Upload/UploadOverlay.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    data: LayoutData & AuthData;
    children?: Snippet;
  }

  let { data, children }: Props = $props();
  let uploadModalOpen = $state(false);

  $effect.pre(() => {
    $preference = data.user?.color_scheme || 'system';
  });
</script>

<svelte:body use:theme />


<div class="grid grid-cols-12 min-h-screen">
  <Sidebar
    class="col-span-2 sm:col-span-4 lg:col-span-3 xl:col-span-2 h-full max-h-screen"
    collections={data.collections}
    onUpload={() => uploadModalOpen = true}
    user={data.user}
  />

  <div class="col-span-10 sm:col-span-8 lg:col-span-9 xl:col-span-10 h-full min-h-full max-h-screen ps-0 p-2">
    <div
      class="min-h-full max-h-full overflow-auto grid border rounded border-gray-200 bg-white dark:border-gray-800
      dark:bg-gray-950"
    >
      <main class="contents">
        {@render children?.()}
      </main>

      <Footer />
    </div>
  </div>
</div>

{#if data.isAuthenticated}
  <UploadOverlay />

  <UploadModal bind:open={uploadModalOpen} />
{/if}
