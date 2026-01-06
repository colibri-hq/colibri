<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string;
    tag?: string;
    children?: Snippet;
    onclick?: (event: MouseEvent) => void;
    onkeydown?: (event: KeyboardEvent) => void;

    [key: string]: unknown;
  }

  let {
    class: className = '',
    tag = 'button',
    children,
    onclick,
    onkeydown,
    ...rest
  }: Props = $props();
</script>

<svelte:element
  this={tag}
  {...rest}
  class="relative flex items-center rounded-md bg-transparent py-2 pr-4 pl-2 text-xl text-white
  transition outline-none hover:bg-white/15 hover:shadow-lg hover:backdrop-blur
  hover:backdrop-saturate-200 focus-visible:bg-white/15 focus-visible:shadow-lg focus-visible:ring
  focus-visible:backdrop-blur focus-visible:backdrop-saturate-200 dark:text-gray-100 {className}"
  onclick={onclick}
  onkeydown={onkeydown}
  role="button"
  tabindex="0"
>
  {@render children?.()}
</svelte:element>
