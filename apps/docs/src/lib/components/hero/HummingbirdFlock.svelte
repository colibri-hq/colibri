<script lang="ts">
  import Hummingbird from './Hummingbird.svelte';

  /**
   * Configuration for each hummingbird in the flock
   */
  const birds = [
    { id: 0, size: 18, delay: 0.0, duration: 4.2 },
    { id: 1, size: 16, delay: 0.2, duration: 3.0 },
    { id: 2, size: 20, delay: 0.1, duration: 5.0 },
    { id: 3, size: 15, delay: 0.4, duration: 2.8 },
    { id: 4, size: 17, delay: 0.3, duration: 3.8 },
  ];
</script>

<!--
  Decorative hummingbird flock animation for hero sections.
  Birds fly through the viewport with cinematic trajectories.
-->
<div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
  {#each birds as bird (bird.id)}
    <Hummingbird {...bird} />
  {/each}
</div>
