<script lang="ts">
  import { Icon } from '@colibri-hq/ui';

  interface Props {
    liked: boolean;
    count: number;
    loading?: boolean;
    onToggle?: () => void;
  }

  let { liked, count, loading = false, onToggle }: Props = $props();
</script>

<button
  class="group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition
    {liked
    ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-950/75'
    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}
    disabled:cursor-not-allowed disabled:opacity-50"
  disabled={loading}
  onclick={onToggle}
  aria-label={liked ? 'Unlike this collection' : 'Like this collection'}
>
  <span
    class="transition-transform {liked ? 'scale-110' : 'group-hover:scale-110'}"
    class:animate-pulse={loading}
  >
    <Icon name={liked ? 'favorite' : 'favorite_border'} class="text-lg" />
  </span>
  <span class="tabular-nums">{count}</span>
</button>
