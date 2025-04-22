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
  class="fixed bottom-0 right-0 p-8"
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
        outline-none transition
        focus-visible:opacity-100 group-hover/spinner:opacity-100 group-hover:opacity-50 group-focus-visible:opacity-50 aria-pressed:opacity-100"
        onclick={pause}
        type="button"
      >
        <Icon class="text-sm leading-none text-blue-100" fill name="pause" />
      </button>
    </LoadingSpinner>
    <span
      class="relative ml-3 mr-2 min-w-min select-none text-sm dark:text-gray-400"
      id="upload-operation-status"
    >
      <span class={paused ? 'opacity-0' : 'opacity-100'}>Uploading Books…</span>
      <span
        class="absolute left-0 top-0 {!paused ? 'opacity-0' : 'opacity-100'}"
        >Upload paused…</span
      >
    </span>
  </div>
</div>
