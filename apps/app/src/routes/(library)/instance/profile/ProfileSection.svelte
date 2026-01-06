<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    help?: Snippet;
    before?: Snippet;
    after?: Snippet;
    footer?: Snippet;
    children?: Snippet;
  }

  let { title, help, before, after, footer, children }: Props = $props();
</script>

<section class="mt-8">
  <header>
    {#if title}
      <h2 class="mb-2 text-lg font-bold dark:text-gray-400">
        {title}
      </h2>
    {/if}
  </header>

  <div class="flex flex-col lg:flex-row">
    {#if before}
      {@render before()}
    {/if}

    <div
      class="w-full pb-4 text-sm text-gray-400 lg:w-1/3 lg:pr-8 lg:pb-0 xl:w-1/4 dark:text-gray-600"
    >
      {#if help}
        {@render help()}
      {/if}
    </div>

    <div
      class="flex w-full flex-col rounded-xl border bg-gray-100 p-4 shadow-inner-sm
    lg:w-2/3 xl:w-3/4 dark:border-gray-950 dark:bg-gray-900"
    >
      {#if children}
        {@render children()}
      {/if}

      {#if after}
        <div class="mt-auto">
          {@render after()}
        </div>
      {/if}
    </div>
  </div>

  {#if footer}
    <footer class="mt-auto">
      {@render footer()}
    </footer>
  {/if}
</section>
