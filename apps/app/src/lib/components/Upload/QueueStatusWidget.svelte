<script lang="ts">
  import LoadingSpinner from '$lib/LoadingSpinner.svelte';
  import { Icon } from '@colibri-hq/ui';
  import { fade } from 'svelte/transition';

  let paused = $state(false);

  function pause() {
    paused = !paused;
  }
</script>

<div
  aria-live="polite"
  class="fixed right-0 bottom-0 p-8"
  role="status"
  transition:fade={{ duration: 150 }}
>
  <div
    class="group flex items-center rounded-xl border bg-white p-2 shadow-lg
    dark:border-gray-700 dark:bg-gray-800 dark:shadow-blue-500/10"
  >
    <LoadingSpinner class="group/spinner" {paused} size={24}>
      <button
        aria-controls="upload-operation-status"
        aria-pressed={paused}
        class="mt-0.5 leading-none opacity-0
        transition outline-none
        group-hover:opacity-50 group-hover/spinner:opacity-100 group-focus-visible:opacity-50 focus-visible:opacity-100 aria-pressed:opacity-100"
        onclick={pause}
        type="button"
      >
        <Icon class="text-sm leading-none text-blue-100" fill name="pause" />
      </button>
    </LoadingSpinner>
    <span
      class="relative mr-2 ml-3 min-w-min text-sm select-none dark:text-gray-400"
      id="upload-operation-status"
    >
      <span class={paused ? 'opacity-0' : 'opacity-100'}>Uploading Books…</span>
      <span
        class="absolute top-0 left-0 {!paused ? 'opacity-0' : 'opacity-100'}"
        >Upload paused…</span
      >
    </span>
  </div>
</div>
