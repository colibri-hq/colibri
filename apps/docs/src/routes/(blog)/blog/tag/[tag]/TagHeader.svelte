<script lang="ts">
  import { TagIcon } from '@lucide/svelte';

  type Props = {
    tag: string;
    count: number;
  };

  const { tag, count }: Props = $props();
</script>

<div class="flex items-center gap-3">
  <TagIcon class="size-8 text-blue-600 dark:text-blue-400" />

  <div>
    <h1 class="text-3xl font-bold font-serif text-gray-900 dark:text-white">
      {tag}
    </h1>
    <span class="text-gray-600 dark:text-gray-400">
      {count} {count === 1 ? "post" : "posts"}
    </span>
  </div>
</div>
