<script lang="ts">
  interface Props {
    emoji: string;
    count: number;
    active?: boolean;
    onClick?: (event: Event) => unknown;
  }

  let { emoji, count, onClick: onclick, active = false }: Props = $props();
</script>

<button
  class="flex cursor-pointer items-center rounded-full
  px-1 py-0.5 transition outline-none hover:ring focus-visible:ring active:ring-blue-700
  {active
    ? 'bg-blue-300 dark:bg-blue-800 dark:hover:bg-blue-800/75'
    : 'bg-gray-200 dark:bg-gray-800 dark:hover:bg-blue-950'}"
  class:pr-1.5={count > 0}
  {onclick}
>
  <span class="text-lg leading-none">{emoji}</span>
  <span
    class="text-xs text-gray-600 transition ease-in-out dark:text-gray-400 {count ===
    0
      ? 'w-0 -translate-x-4 opacity-0'
      : 'ml-1'}"
  >
    {count}
  </span>
</button>
