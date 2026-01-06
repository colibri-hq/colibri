<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  const { children }: Props = $props();

  let revealed = $state(false);

  function handleClick() {
    revealed = true;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      revealed = true;
    }
  }
</script>

<span
  class="spoiler"
  class:revealed
  role="button"
  tabindex={revealed ? -1 : 0}
  aria-label={revealed ? undefined : 'Click to reveal spoiler'}
  onclick={handleClick}
  onkeydown={handleKeyDown}
>
  {@render children?.()}
</span>

<style>
  .spoiler {
    background-color: rgb(156 163 175 / 0.3);
    border-radius: 0.25rem;
    padding: 0 0.25rem;
    cursor: pointer;
    filter: blur(4px);
    transition: filter 0.2s ease-out, background-color 0.2s ease-out;
    user-select: none;
  }

  .spoiler:hover:not(.revealed) {
    background-color: rgb(156 163 175 / 0.4);
  }

  .spoiler:focus-visible:not(.revealed) {
    outline: 2px solid rgb(59 130 246);
    outline-offset: 2px;
  }

  .spoiler.revealed {
    filter: blur(0);
    background-color: rgb(156 163 175 / 0.15);
    user-select: text;
    cursor: text;
  }

  /* Dark mode adjustments */
  :global(.dark) .spoiler {
    background-color: rgb(75 85 99 / 0.3);
  }

  :global(.dark) .spoiler:hover:not(.revealed) {
    background-color: rgb(75 85 99 / 0.4);
  }

  :global(.dark) .spoiler.revealed {
    background-color: rgb(75 85 99 / 0.15);
  }
</style>
