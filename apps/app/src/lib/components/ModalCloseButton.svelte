<script lang="ts">
    import { Icon } from '@colibri-hq/ui';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  function close() {
    open = false;
  }
</script>

<!-- svelte-ignore a11y_autofocus -->
<button
  aria-label="Close dialog"
  autofocus
  class="absolute -top-12 right-0 ml-auto flex h-16 w-16 flex-col items-center justify-center
  rounded-full bg-white/20 text-white/80 transition hover:bg-white/40 hover:text-white
  dark:bg-black/20 dark:hover:bg-black/60"
  onclick={close}
  tabindex="0"
>
  <Icon class="text-4xl" name="close" weight={500} />

  <span
    aria-hidden="true"
    class="absolute bottom-1 left-1/2 flex -translate-x-1/2 space-x-px text-[8px] opacity-75
    dark:opacity-50"
  >
    <span class="block rotate-6">E</span>
    <span class="mt-[0.5px] block">S</span>
    <span class="block -rotate-6">C</span>
  </span>
</button>
