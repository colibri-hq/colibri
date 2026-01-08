<script lang="ts">
  import type { Snippet } from 'svelte';
  import { twMerge } from 'tailwind-merge';

  type Props = {
    tag?: string;
    children?: Snippet;
    class?: string;
    [key: string]: unknown;
  };

  const { tag = 'div', children, class: className = '', ...rest }: Props = $props();
</script>

<svelte:element this={tag} {...rest} class={twMerge('px-4', className)}>
  <div class="max-w-5xl mx-auto">
    {@render children?.()}
  </div>
</svelte:element>
