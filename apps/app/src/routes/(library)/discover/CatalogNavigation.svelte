<script lang="ts">
  import type { Catalog } from './+layout.svelte';
  import type { MaybePromise } from '@colibri-hq/shared';

  interface Props {
    catalogs: MaybePromise<Catalog[]>;
  }

  let { catalogs }: Props = $props();
</script>

<nav class="mt-16 w-1/5 py-2">
  {#await catalogs}
    <span class="text-sm text-gray-500">Loading catalogs…</span>
  {:then catalogs}
    <ul class="flex flex-col space-y-1">
      {#each catalogs as catalog}
        <li>
          <a
            href="/discover/{catalog.id}/{catalog.slug}"
            class="block rounded px-2 py-1 text-sm text-gray-700 outline-none transition
            hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:ring"
          >
            <span>{catalog.title}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/await}
</nav>
