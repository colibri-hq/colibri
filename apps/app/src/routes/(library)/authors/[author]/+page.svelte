<script lang="ts">
  import WorkLink from '$lib/components/Links/WorkLink.svelte';
  import type { PageProps } from './$types';
  import { Icon } from '@colibri-hq/ui';

  let { data }: PageProps = $props();
  let author = $derived(data.author);
  let works = $derived(data.works);

  let authorInfoLoading: boolean = false;
</script>

<div class="mx-auto flex w-full max-w-6xl px-8 py-16">
  <article class="grow">
    <header class="mb-8 flex items-center">
      <div
        class="mr-4 flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-gray-200 object-cover dark:bg-gray-700"
      >
        {#if author.image_id}
          <img
            alt="Picture of {author.name}"
            class="h-full w-full rounded-full object-cover"
            src="/creators/{author.id}/picture"
          />
        {:else}
          <Icon name="person" class="text-4xl text-gray-500" />
        {/if}
      </div>
      <div class="flex flex-col">
        <h1 class="text-4xl font-bold">{author.name}</h1>

        {#if author.description}
          <p class="mt-4">
            <span>{author.description}</span>
            {#if author.wikipedia_url}
              <a
                target="_blank"
                href={author.wikipedia_url}
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

      {#await works}
        <span>Loading...</span>
      {:then works}
        <ul class="grid grid-cols-2 gap-8 md:grid-cols-4 xl:grid-cols-6">
          {#each works as work, index (index)}
            <li class="contents">
              <WorkLink
                work={work.work_id ?? work.id}
                title={work.title}
                edition={work.id}
                blurhash={work.cover_blurhash}
              />
            </li>
          {/each}
        </ul>
      {/await}
    </section>
  </article>
</div>
