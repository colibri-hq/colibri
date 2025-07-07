<script lang="ts">
  import { createBubbler } from 'svelte/legacy';

  const bubble = createBubbler();

  interface Props {
    class?: string;
    tag?: string;
    children?: import('svelte').Snippet;

    [key: string]: unknown;
  }

  let {
    class: className = '',
    tag = 'button',
    children,
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
  onclick={bubble('click')}
  onkeydown={bubble('keydown')}
  role="button"
  tabindex="0"
>
  {@render children?.()}
</svelte:element>
