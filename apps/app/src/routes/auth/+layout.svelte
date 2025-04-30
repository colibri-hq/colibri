<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<svelte:head>
  <title>Account • Colibri</title>
</svelte:head>

<article
  class="mx-auto w-max px-8 pt-12 pb-0 md:w-full md:max-w-6xl md:pt-32 md:pb-16"
>
  {@render children?.()}
</article>
