<script lang="ts" module>
  import { DropdownMenu } from 'bits-ui';

  export type OverflowOption = {
    /** Unique identifier for the option */
    id: string;
    /** Display title */
    title: string;
    /** Optional icon name (Material Symbols) */
    icon?: string;
    /** Handler called when option is selected */
    onselect?: () => unknown;
    /** Optional href for link options */
    href?: string;
  };

  /** Symbol to insert a divider in the options array */
  export const Divider: unique symbol = Symbol('OverflowButton.Divider');

  export type OverflowItem = OverflowOption | typeof Divider;

  type Side = 'top' | 'bottom' | 'left' | 'right';
  type Align = 'start' | 'center' | 'end';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '$lib/ui';
  import { ChevronDownIcon } from '@lucide/svelte';

  interface Props {
    /** Controls menu visibility (bindable) */
    open?: boolean;
    /** Primary action button click handler */
    onclick?: () => unknown;
    /** Primary button content */
    children?: Snippet;
    /** Dropdown menu options */
    options?: readonly OverflowItem[];
    /** Custom snippet to render each option item */
    item?: Snippet<[OverflowOption]>;
    /** Side of the trigger to show the menu */
    side?: Side;
    /** Alignment relative to the trigger */
    align?: Align;
    /** Offset from the trigger */
    sideOffset?: number;
    /** Called when open state changes */
    onOpenChange?: (open: boolean) => void;
    /** Additional classes for the primary button */
    class?: string;
    /** Additional classes for the content container */
    contentClass?: string;
    /** Aria label for the dropdown trigger button */
    label?: string;
    /** Disabled state */
    disabled?: boolean;
  }

  let {
    open = $bindable(false),
    onclick,
    children,
    options = [],
    item,
    side = 'bottom',
    align = 'end',
    sideOffset = 4,
    onOpenChange,
    class: className = '',
    contentClass = '',
    label: ariaLabel = 'More options',
    disabled = false,
  }: Props = $props();

  function handleOpenChange(value: boolean) {
    open = value;
    onOpenChange?.(value);
  }

  function handleSelect(option: OverflowOption) {
    option.onselect?.();
    open = false;
  }

  function isDivider(item: OverflowItem): item is typeof Divider {
    return item === Divider;
  }

  const _component = DropdownMenu;
</script>

<div
  class="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 focus-within:border-blue-500
   focus-within:ring-2 ring-blue-500 select-none ring-inset"
>
  {#if children}
    <button
      type="button"
      {onclick}
      {disabled}
      class="inline-flex items-center gap-2 px-4 py-1 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50
      focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 transition duration-150
      dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-s-lg disabled:opacity-50 ring-inset
       disabled:cursor-not-allowed {className}"
    >
      {@render children()}
    </button>

    <div class="w-px bg-gray-300 dark:bg-gray-600"></div>
  {/if}

  <DropdownMenu.Root bind:open onOpenChange={handleOpenChange}>
    <DropdownMenu.Trigger
      {disabled}
      class="inline-flex items-center justify-center px-2 py-1 text-gray-600 dark:text-gray-400 bg-white
      dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100
      aria-expanded:bg-gray-100 dark:aria-expanded:bg-gray-700 focus-visible:outline-hidden
      focus-visible:ring-2 focus-visible:ring-blue-500 transition disabled:opacity-50 rounded-r-lg ring-inset
      disabled:cursor-not-allowed"
      aria-label={ariaLabel}
    >
      <ChevronDownIcon class="size-5" />
    </DropdownMenu.Trigger>

    <DropdownMenu.Portal>
      <DropdownMenu.Content
        {side}
        {align}
        {sideOffset}
        class="z-20 min-w-56 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white
          dark:bg-gray-800 shadow-lg animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2
          data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2
          data-[side=top]:slide-in-from-bottom-2 select-none {contentClass}"
      >
        {#each options as option, index (index)}
          {#if isDivider(option)}
            <DropdownMenu.Separator class="my-1 h-px bg-gray-200 dark:bg-gray-700" />
          {:else}
            {#snippet inner()}
              {#if item}
                {@render item(option)}
              {:else}
                {#if option.icon}
                  <Icon name={option.icon} class="text-lg" />
                {/if}
                <span>{option.title}</span>
              {/if}
            {/snippet}

            <DropdownMenu.Item
              class="flex w-full cursor-pointer items-center gap-3 px-3 py-1.5 text-sm text-gray-700
              dark:text-gray-200 outline-hidden data-highlighted:bg-gray-100 dark:data-highlighted:bg-gray-700
              transition-colors"
              onSelect={() => handleSelect(option)}
            >
              {#if option.href}
                <!-- eslint-disable svelte/no-navigation-without-resolve -->
                <a
                  href={option.href}
                  target={option.href.startsWith('http') ? '_blank' : '_self'}
                  rel={option.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  onclick={() => (open = false)}
                  class="inline-flex w-full items-center gap-3"
                >
                  <!-- eslint-enable svelte/no-navigation-without-resolve -->
                  {@render inner()}
                </a>
              {:else}
                {@render inner()}
              {/if}
            </DropdownMenu.Item>
          {/if}
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
</div>
