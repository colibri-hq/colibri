<script lang="ts">
  interface Props {
    class?: string;
    title: string;
    content?: import('svelte').Snippet;
    children?: import('svelte').Snippet;

    [key: string]: unknown;
  }

  let {
    class: className = '',
    title,
    content,
    children,
    ...rest
  }: Props = $props();

  const classes = `mb-4 w-full ${className}`.trimEnd();
</script>

<header {...rest} class={classes}>
  {#if content}{@render content()}{:else}
    <h1 class="font-serif text-3xl font-medium">
      {#if children}{@render children()}{:else}{title}{/if}
    </h1>
  {/if}
</header>
