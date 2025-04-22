<script lang="ts">
  import { fade } from 'svelte/transition';

  interface Props {
    visible: boolean;
  }

  let { visible }: Props = $props();
</script>

{#if visible}
  <div class="spinner" aria-busy="true" transition:fade></div>
{/if}

<style>
  div {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: var(--border-radius);
    background: var(--card-background-color);
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
