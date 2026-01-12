<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string;
    title: string;
    content?: Snippet;
    children?: Snippet;

    [key: string]: unknown;
  }

  let {
    class: className = '',
    title,
    content,
    children,
    ...rest
  }: Props = $props();
</script>

<header {...rest} class="mb-4 w-full {className}">
  {#if content}{@render content()}{:else}
    <h1 class="font-serif text-3xl font-medium">
      {#if children}{@render children()}{:else}{title}{/if}
    </h1>
  {/if}
</header>
