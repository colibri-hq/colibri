<script lang="ts">
  import type { PageData } from './$types';
    import { Icon } from '@colibri-hq/ui';
  import BookLink from '$lib/components/Links/BookLink.svelte';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let creator = $derived(data.creator);
  let contributions = $derived(data.contributions);
</script>

<article>
  <header
    class="mb-4 grid grid-cols-[min-content_auto] grid-rows-[auto_1fr] gap-4"
  >
    <div
      class="row-span-2 flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gray-100 object-cover shadow"
    >
      {#if creator.image}
        <img
          src="/creators/{creator.id}/picture"
          class="h-full w-full rounded-full object-cover"
          alt="Picture of {creator.name}"
        />
      {:else}
        <Icon name="person" class="leading-none text-gray-500" />
      {/if}
    </div>
    <h1 class="font-serif text-3xl font-bold">{creator.name}</h1>
    <p class="text-sm text-gray-500">{creator.description}</p>
  </header>

  <section>
    <header class="mb-4">
      <h2 class="text-2xl">Works</h2>
    </header>

    {#await contributions}
      <span>Loading...</span>
    {:then contributions}
      <ul class="grid grid-cols-2 gap-8 md:grid-cols-4 xl:grid-cols-6">
        {#each contributions as work}
          <li class="contents">
            <BookLink
              book={work.book_id ?? ''}
              edition={work.id}
              title={work.title}
              blurhash={work.cover_blurhash}
            />
          </li>
        {/each}
      </ul>
    {/await}
  </section>
</article>
