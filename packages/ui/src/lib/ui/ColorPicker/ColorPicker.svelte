<script lang="ts" module>
  export type ColorPickerInputEvent = { color: string };

  export const presetColors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#6b7280', // gray
    '#000000', // black
  ] as const;
</script>

<script lang="ts">
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { Popover } from '../Popover/index.js';
  import type { Snippet } from 'svelte';

  interface Props {
    open?: boolean;
    value?: string | null;
    trigger?: Snippet<[{ open: boolean; props: Record<string, unknown> }]>;
    class?: string;
    onInput?: (event: ColorPickerInputEvent) => unknown;
  }

  let {
    open = $bindable(false),
    value = $bindable(null),
    onInput,
    trigger,
    class: className,
  }: Props = $props();

  function close() {
    open = false;
  }

  function pick(color: string) {
    return () => {
      value = color;
      onInput?.({ color });
      close();
    };
  }

  function clear() {
    value = null;
    onInput?.({ color: '' });
    close();
  }
</script>

<Popover
  bind:open
  {trigger}
  sideOffset={8}
  collisionPadding={16}
  class="z-40 w-64 rounded-2xl bg-white/75 p-4 {className}
    shadow-xl backdrop-blur-3xl backdrop-saturate-200 dark:bg-black dark:ring dark:ring-gray-800 dark:ring-opacity-50"
>
  <article transition:slide={{ duration: 125, easing: quintOut }}>
    <div class="grid grid-cols-5 gap-2">
      {#each presetColors as color (color)}
        <button
          class="flex h-10 w-10 items-center justify-center rounded-lg outline-none
            transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary-500
            {value === color ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900' : ''}"
          style:background-color={color}
          onclick={pick(color)}
          aria-label="Select color {color}"
        >
          {#if value === color}
            <svg
              class="h-5 w-5 text-white drop-shadow"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="3"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          {/if}
        </button>
      {/each}
    </div>

    {#if value}
      <button
        class="mt-3 w-full rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600
          hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        onclick={clear}
      >
        Clear color
      </button>
    {/if}
  </article>
</Popover>
