<script lang="ts">
  type Props = {
    src: string;
    alt: string;
    [key: string]: unknown;
  };

  const { src, alt, ...rest }: Props = $props();

  let hasError = $state(false);

  function handleError() {
    hasError = true;
  }
</script>

{#if hasError}
  <div class="rounded-sm bg-gray-100 dark:bg-gray-800 p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
    <span class="block">Image failed to load</span>
    {#if alt}
      <span class="block text-xs mt-1">{alt}</span>
    {/if}
  </div>
{:else}
  <img {...rest} {src} {alt} class="rounded-sm max-w-full size-fit h-auto" onerror={handleError}>
{/if}
