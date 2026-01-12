<script lang="ts">
  import MetaItem from './MetaItem.svelte';
  import type { Publisher, Work } from './+page@(library).svelte';
  import { resolve } from '$app/paths';

  interface Props {
    class?: string;
    work: Work;
    publisher: Promise<Publisher>;
  }

  let { class: className = '', work, publisher }: Props = $props();
  const publishingYear = $derived<number | undefined>(work.published_at
    ? new Date(work.published_at).getUTCFullYear()
    : undefined);
</script>

<div class={className}>
  <ul class="flex items-stretch justify-center">
    <!-- TODO: Parse actual thrillers -->
    <MetaItem name="Genre" value="Thriller" />

    {#if work.published_at}
      <MetaItem name="Published" value={publishingYear} />
    {/if}

    {#await publisher}
      <span class="hidden" aria-hidden="true"></span>
    {:then publisher}
      {#if publisher}
        <MetaItem name="Publisher">
          <a href={resolve('/(library)/publishers/[publisher]', { publisher: publisher.id })}>
            {publisher.name}
          </a>
        </MetaItem>
      {/if}
    {/await}

    {#if work.language}
      <MetaItem name="Language" value={work.language.toUpperCase()}>
        {#snippet secondary()}
          <span>
            {work.language_name}
          </span>
        {/snippet}
      </MetaItem>
    {/if}
  </ul>
</div>
