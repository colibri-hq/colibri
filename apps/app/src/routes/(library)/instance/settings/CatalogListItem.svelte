<script lang="ts" module>
  import type { Catalog } from './+page.svelte';

  export type CatalogEventDetail = { catalog: Catalog };
</script>

<script lang="ts">
  import { Toggle } from '@colibri-hq/ui';
  import { Icon } from '@colibri-hq/ui';
  import { parseCssColor, rgbToCssColor } from '$lib/colors';

  interface Props {
    catalog: Catalog;
    disabled?: boolean;
    onenable?: (detail: CatalogEventDetail) => void;
    ondisable?: (detail: CatalogEventDetail) => void;
  }

  let { catalog, disabled = false, onenable, ondisable }: Props = $props();

  function toggle(active: boolean) {
    if (disabled || catalog.active === active) {
      return;
    }

    if (active) {
      onenable?.({ catalog });
    } else {
      ondisable?.({ catalog });
    }
  }

  let backgroundColor = $derived(
    catalog.color
      ? rgbToCssColor(parseCssColor(`rgb${catalog.color}`), 0.25)
      : undefined,
  );
  let title = $derived(catalog.title ?? new URL(catalog.feed_url).hostname);
</script>

<li
  class="rounded-3xl bg-gray-50 shadow-inner-sm dark:bg-gray-900 dark:shadow-none dark:ring
  dark:ring-gray-700/50"
>
  <!-- eslint-disable svelte/no-inline-styles -- Dynamic gradient from catalog data -->
  <div
    class="flex items-start rounded-3xl p-4"
    style:background="linear-gradient(120deg, {backgroundColor} 5%, transparent 50%)"
  >
  <!-- eslint-enable svelte/no-inline-styles -->
    <!-- region Catalog image -->
    <div
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white"
    >
      {#if catalog.image_url}
        <img
          src={catalog.image_url}
          class="h-auto w-8 overflow-hidden rounded-full object-cover"
          alt="Logo of the catalog feed of {catalog.title}"
        />
      {:else}
        <Icon name="local_library" class="text-gray-500 dark:text-gray-400" />
      {/if}
    </div>
    <!-- endregion -->

    <!-- region Catalog metadata -->
    <div class="mx-2 flex flex-col overflow-hidden">
      <!-- region Catalog title -->
      <div class="flex flex-col items-start md:flex-row md:items-center">
        <strong class="leading-none text-inherit">{title}</strong>
        {#if catalog.credentials_required}
          <span
            class="mt-1 flex items-center rounded border border-current pr-0.5 pl-1 text-xs font-semibold whitespace-nowrap
            text-orange-500 uppercase md:mt-0 md:ml-2 dark:text-orange-400"
          >
            <span>
              Requires Auth<span class="hidden md:inline">entication</span>
            </span>
            <Icon
              name="lock"
              class="ml-0.5 text-xs leading-none text-orange-500 dark:text-orange-400"
              weight={800}
            />
          </span>
        {/if}
      </div>
      <!-- endregion -->

      <!-- region Catalog feed URL -->
      <a
        class="max-w-full overflow-hidden text-sm text-ellipsis whitespace-nowrap
        opacity-50 outline-none hover:underline focus-visible:text-gray-400
        focus-visible:underline dark:focus-visible:text-gray-300"
        href={catalog.feed_url}
        rel="noopener nofollow"
        target="_blank">{catalog.feed_url}</a
      >
      <!-- endregion -->

      {#if catalog.description}
        <p class="mt-1">{catalog.description}</p>
      {/if}

      <a
        class="mt-2 text-blue-500 hover:underline dark:text-blue-400"
        href={catalog.url}
      >
        Visit website &raquo;
      </a>
    </div>
    <!-- endregion -->

    <!-- region Toggle -->
    <div class="ml-auto flex items-center justify-center self-center">
      <Toggle
        checked={catalog.active}
        {disabled}
        onCheckedChange={toggle}
        size="medium"
      />
    </div>
    <!-- endregion -->
  </div>
</li>
