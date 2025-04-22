<script lang="ts">
  import Modal from '$lib/components/Modal.svelte';
  import { Field } from '@colibri-hq/ui';
  import { Button } from '@colibri-hq/ui';
  import { fade } from 'svelte/transition';
  import { trpc } from '$lib/trpc/client';
  import { page } from '$app/stores';
  import LoadingSpinner from '$lib/LoadingSpinner.svelte';
  import type { RouterOutputs } from '$lib/trpc/router';
    import { Icon } from '@colibri-hq/ui';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();
  let error: string | undefined = $state(undefined);
  let loading = $state(false);

  let feedUrl: string = $state('');
  let title = $state('');
  let description = $state('');
  let imageUrl: string | undefined = $state(undefined);
  let result: RouterOutputs['catalogs']['fetchRemoteCatalog'] | undefined =
    $state(undefined);

  async function handlePastedUrl() {
    await new Promise((resolve) => setTimeout(resolve, 1));

    if (!validCatalogUrl) {
      return;
    }

    return loadCatalog();
  }

  async function loadCatalog() {
    if (!validCatalogUrl || loading) {
      return;
    }

    loading = true;
    error = undefined;

    try {
      result = await trpc($page).catalogs.fetchRemoteCatalog.query({ feedUrl });
    } catch (err) {
      console.error('Failed to fetch catalog:', err);
      error =
        err instanceof Error
          ? err.message
          : `Loading the catalog failed: ${error}`;
    } finally {
      loading = false;
    }

    title = result?.title ?? '';
    imageUrl = result?.imageUrl;
    description = result?.description ?? '';
  }

  async function addCatalog() {
    loading = true;

    try {
      await trpc($page).catalogs.addCatalog.mutate({
        feedUrl,
        title,
        description,
        imageUrl,
      });
      open = false;
    } catch (err) {
      console.error('Failed to add catalog:', err);
      error =
        err instanceof Error
          ? err.message
          : `Adding the catalog failed: ${error}`;
    } finally {
      loading = false;
    }
  }

  function parseUrl(url: string) {
    try {
      return new URL(url);
    } catch {
      return undefined;
    }
  }

  let parsedUrl = $derived(parseUrl(feedUrl));
  let validCatalogUrl = $derived(typeof parsedUrl !== 'undefined');
  let validCatalog = $derived(validCatalogUrl && result);
</script>

<Modal bind:open class="max-w-96">
  {#snippet header()}
    <h1 class="text-lg font-bold">Add a new catalog</h1>
  {/snippet}

  <p class="text-sm text-gray-600 dark:text-gray-400">
    Add a new OPDS catalog to Colibri. A catalog provides a way to browse and
    download books from a specific source, like a library or a bookstore. You
    can add a catalog by providing its OPDS feed URL. Colibri will regularly fetch
    the feed and display the books in the <em>Discover</em>
    section.<br />
    If you're not sure how this works, take a look at the&nbsp;<a
      class="underline"
      href="/help/catalogs">catalog&nbsp;documentation</a
    >.
  </p>

  <div class="mt-4 grid grid-cols-[auto_min-content] items-center gap-4">
    <Field
      bind:value={feedUrl}
      class="col-span-2"
      label="OPDS feed URL"
      name="feed"
      on:paste={handlePastedUrl}
      required
      type="url"
    />

    {#if validCatalog}
      <Field
        label="Catalog Title"
        name="feed"
        type="text"
        required
        bind:value={title}
      />

      <div
        class="flex h-10 w-10 items-center justify-center rounded-full border bg-white"
      >
        {#if imageUrl}
          <img
            src={imageUrl}
            class="h-auto w-8 overflow-hidden rounded-full object-cover"
            alt="Logo of the catalog feed of {title}"
          />
        {:else}
          <Icon name="local_library" class="text-gray-500 dark:text-gray-400" />
        {/if}
      </div>

      <Field
        class="col-span-2"
        label="Description"
        name="feed"
        type="text"
        required
        bind:value={description}
      />
    {/if}
  </div>

  {#if error}
    <div
      class="mt-2 rounded-lg bg-red-50 p-2 text-sm shadow-sm shadow-red-500/25 ring ring-red-200"
      transition:fade={{ delay: 50, duration: 100 }}
    >
      <strong class="text-red-700">⚠️ Could not fetch catalog</strong>
      <p class="text-red-900">{error}</p>
    </div>
  {/if}

  <footer class="mt-4 flex items-center">
    {#if validCatalog}
      <Button onClick={addCatalog} disabled={loading}>Add catalog</Button>
    {:else}
      <Button onClick={loadCatalog} disabled={!validCatalogUrl || loading}>
        Fetch catalog
      </Button>
    {/if}

    {#if loading}
      <LoadingSpinner class="ml-auto" />
    {/if}
  </footer>
</Modal>
