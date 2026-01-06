<script lang="ts">
  import { Icon } from '@colibri-hq/ui';

  interface Props {
    series: {
      id: string;
      name: string | null;
      work_count?: string | number | null;
    };
  }

  let { series }: Props = $props();
</script>

<a class="contents" href="/series/{series.id}">
  <article class="flex items-center" id="series-{series.id}">
    <header class="contents">
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 object-cover shadow dark:bg-blue-900/50"
      >
        <Icon name="library_books" class="leading-none text-blue-600 dark:text-blue-400" />
      </div>
      <div class="ml-4">
        <h3 class="text-base font-bold">{series.name ?? 'Unnamed Series'}</h3>
        {#if series.work_count}
          <p class="text-sm text-gray-500">
            {series.work_count} {Number(series.work_count) === 1 ? 'book' : 'books'}
          </p>
        {/if}
      </div>
    </header>
  </article>
</a>
