<script lang="ts">
  import Sidebar from '$lib/components/Sidebar/Sidebar.svelte';
  import UploadModal from '$lib/components/Upload/UploadModal.svelte';
  import KeyboardShortcuts from '$lib/components/KeyboardShortcuts.svelte';
  import type { AuthData } from '../+layout.server';
  import type { LayoutData } from './$types';
  import { preference, theme } from '$lib/actions/theme';
  import UploadOverlay from '$lib/components/Upload/UploadOverlay.svelte';
  import ImportSubscription from '$lib/components/Upload/ImportSubscription.svelte';
  import CommentSubscription from '$lib/components/Notifications/CommentSubscription.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import type { Snippet } from 'svelte';
  import { Toaster } from 'svelte-sonner';

  interface Props {
    data: LayoutData & AuthData;
    children?: Snippet;
  }

  let { data, children }: Props = $props();
  let uploadModalOpen = $state(false);
  let notificationCenterOpen = $state(false);

  $effect.pre(() => {
    $preference = data.user?.color_scheme || 'system';
  });

</script>

<svelte:body use:theme />

<div class="grid min-h-screen grid-cols-12">
  <Sidebar
    class="col-span-2 h-full max-h-screen sm:col-span-4 lg:col-span-3 xl:col-span-2"
    collections={data.collections}
    onUpload={() => (uploadModalOpen = true)}
    user={data.user}
    moderationEnabled={data.moderationEnabled}
    bind:notificationCenterOpen
  />

  <div
    class="col-span-10 h-full max-h-screen min-h-full p-2 ps-0 sm:col-span-8 lg:col-span-9 xl:col-span-10"
  >
    <div
      class="grid max-h-full min-h-full overflow-auto rounded border border-gray-200 bg-white dark:border-gray-800
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
  <ImportSubscription />
  <CommentSubscription />

  <UploadModal bind:open={uploadModalOpen} />
{/if}

<!-- Toaster slides off-screen when notification panel is open -->
<div class="toaster-container" class:panel-open={notificationCenterOpen}>
  <Toaster position="bottom-right" richColors closeButton />
</div>

<KeyboardShortcuts onOpenNotifications={() => (notificationCenterOpen = true)} />

<style>
  /* Slide toasts off-screen when notification panel is open */
  .toaster-container :global([data-sonner-toaster]) {
    transition: transform 300ms ease-out;
  }

  .toaster-container.panel-open :global([data-sonner-toaster]) {
    transform: translateX(120%);
  }
</style>
