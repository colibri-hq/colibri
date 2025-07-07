<script lang="ts">
  import { BlurhashPanel } from '@colibri-hq/ui';
  import GrainOverlay from '$lib/components/GrainOverlay.svelte';

  interface Props {
    class: string;
    blurhash: string | undefined | null;
    [key: string]: unknown;
  }

  let { class: className, blurhash, ...rest }: Props = $props();
</script>

<div
  {...rest}
  aria-hidden="true"
  class="w-full transition will-change-auto {className}"
>
  <!-- On top of the blurhash or gradient area, we render some noise, making for a neat visual effect -->
  <GrainOverlay
    class="absolute {blurhash ? 'opacity-35 dark:opacity-50' : ''}"
  />

  {#if blurhash}
    <BlurhashPanel class="h-full w-full" {blurhash} />
  {:else}
    <div
      class="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-60"
    ></div>
  {/if}
</div>
