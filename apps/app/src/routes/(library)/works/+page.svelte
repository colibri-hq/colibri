<script lang="ts">
  import { Field } from '@colibri-hq/ui';
  import WorkLink from '$lib/components/Links/WorkLink.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let works = $derived(data.works);
  let searchTerm = $state('');
</script>

<article>
  <header class="flex items-center justify-between pb-8">
    <h1 class="font-serif text-4xl font-medium">Works</h1>

    <div class="actions">
      <Field
        appendIcon="search"
        bind:value={searchTerm}
        placeholder="Search"
        type="search"
      />
    </div>
  </header>

  <ul class="grid grid-cols-2 gap-8 md:grid-cols-4 xl:grid-cols-6">
    {#each works as work, index (index)}
      <li class="contents">
        <WorkLink
          work={work.work_id ?? work.id}
          title={work.title ?? 'Untitled'}
          edition={work.main_edition_id ?? work.id}
          blurhash={work.cover_blurhash}
        />
      </li>
    {/each}
  </ul>
</article>
