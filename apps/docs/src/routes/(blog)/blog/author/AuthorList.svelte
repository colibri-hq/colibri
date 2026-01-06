<script lang="ts">
  import { AuthorCard } from '$lib/components/blog';
  import type { AuthorInfo } from '$lib/content/blog';

  type Props = {
    authors: AuthorInfo[];
  };

  const { authors }: Props = $props();
</script>

<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {#each authors as { author, count } (author.name)}
    <li class="contents">
      <AuthorCard
        {author}
        {count}
        size="large"
        class="p-4 ring bg-white dark:bg-gray-950 ring-gray-200 dark:ring-gray-800 hover:ring-blue-300
        dark:hover:ring-blue-600"
      />
    </li>
  {/each}
</ul>
