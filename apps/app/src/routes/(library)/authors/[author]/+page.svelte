<script lang="ts">
  import Book from '$lib/components/Links/BookLink.svelte';
  import type { PageData } from './$types';
  import { Icon } from '@colibri-hq/ui';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let authorInfoLoading: boolean = false;
</script>

<div class="mx-auto flex w-full max-w-6xl px-8 py-16">
  <article class="grow">
    <header class="mb-8 flex items-center">
      <img
        alt="Picture of {data.author.name}"
        class="mr-4 h-32 w-32 shrink-0 rounded-full bg-gray-200 object-cover"
        src={data.author.pictureUrl}
      />
      <div class="flex flex-col">
        <h1 class="text-4xl font-bold">{data.author.name}</h1>

        {#if data.author.description}
          <p class="mt-4">
            <span>{data.author.description}</span>
            {#if data.author.wikipediaUrl}
              <a
                target="_blank"
                href={data.author.wikipediaUrl}
                rel="noopener noreferrer"
                class="text-blue-500 underline">Wikipedia</a
              >
            {/if}
          </p>
        {:else}
          <div
            class="mt-1 flex cursor-pointer items-center justify-start text-sm text-blue-500 select-none"
          >
            <div class="mr-1">
              {#if authorInfoLoading}
                <Icon name="sync" class="text-lg" />
              {:else}
                <Icon name="lightbulb" class="text-lg" />
              {/if}
            </div>

            <span class="text-blue-500 underline">
              It seems like there is no information available on this author
              yet. Search the web
            </span>
          </div>
        {/if}
      </div>
    </header>

    <section>
      <header class="mb-4">
        <h2 class="text-2xl">Works</h2>
      </header>

      <ul class="grid grid-cols-2 gap-8 md:grid-cols-4 xl:grid-cols-6">
        {#each data.author.books as book, index (index)}
          <li class="contents">
            <Book {book} />
          </li>
        {/each}
      </ul>
    </section>
  </article>
</div>
