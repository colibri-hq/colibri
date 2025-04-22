<script lang="ts">
  import { type Snippet } from 'svelte';
  import { twMerge } from 'tailwind-merge';
  import Icon from '../Icon/Icon.svelte';

  interface Props {
    class?: string;
    open?: boolean;
    initialOpen?: boolean;
    label?: string | Snippet;
    children: Snippet;
  }

  let {
    initialOpen = false,
    open = $bindable(initialOpen),
    class: className = '',
    label,
    children,
  }: Props = $props();
</script>

<details
  class={twMerge('flex flex-col gap-4', className, 'group')}
  {open}
>
  <summary
    class="list-none flex items-center gap-1 border-b my-1 sm:ps-2.5 sm:mt-0 border-gray-200 dark:border-gray-700
    sm:border-none cursor-pointer select-none"
  >
    <span class="hidden sm:contents">
      <strong class="text-sm font-bold text-gray-600 dark:text-gray-400">
        {#if typeof label === 'string'}
          {label}
        {:else}
          {@render label()}
        {/if}
      </strong>

      <Icon name="arrow_right" class="group-open:rotate-90 transition-all select-none" />
    </span>
  </summary>

  <ul class="flex flex-col gap-y-1">
    {@render children()}
  </ul>
</details>
