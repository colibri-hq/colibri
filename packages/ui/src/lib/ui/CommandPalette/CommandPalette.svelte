<script lang="ts" module>
  import { Command as CommandPrimitive, Dialog as DialogPrimitive } from 'bits-ui';

  export type CommandPaletteOption = {
    /** Unique identifier for the option */
    id: string;
    /** Display title */
    title: string;
    /** Optional subtitle or description */
    subtitle?: string;
    /** Optional icon name (Material Symbols) */
    icon?: string;
    /** Value used for filtering (defaults to title if not provided) */
    filterValue?: string;
    /** Handler called when option is selected */
    onselect?: () => unknown;
    /** Optional href for link options */
    href?: string;
    /** Additional data that can be passed to the item snippet */
    data?: unknown;
  };

  export type CommandPaletteGroup = {
    /** Unique identifier for the group */
    id: string;
    /** Optional heading for the group */
    heading?: string;
    /** Items in this group */
    items: CommandPaletteOption[];
  };

  const _deps = [DialogPrimitive, CommandPrimitive];
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '../Icon/index.js';
  import { Button } from '$lib/ui';
  import { CornerDownLeftIcon, SearchIcon, XIcon, ArrowUpIcon, ArrowDownIcon } from '@lucide/svelte';

  interface Props {
    /** Controls dialog visibility (bindable) */
    open?: boolean;
    /** Placeholder text for the search input */
    placeholder?: string;
    /** Message to show when no results are found */
    emptyMessage?: string;
    /** Enable/disable built-in filtering (disable for external search) */
    shouldFilter?: boolean;
    /** Enable keyboard loop navigation */
    loop?: boolean;
    /** Enable VIM-style navigation (ctrl+n/j/p/k) */
    vimBindings?: boolean;
    /** Called when open state changes */
    onOpenChange?: (open: boolean) => void;
    /** Called when the input value changes */
    onValueChange?: (value: string) => void;
    /** Current input value (bindable) */
    value?: string;
    /** Groups of options to display */
    groups?: readonly CommandPaletteGroup[];
    /** Custom snippet to render each option item */
    item?: Snippet<[option: CommandPaletteOption, group: CommandPaletteGroup]>;
    /** Loading state indicator snippet */
    loading?: Snippet;
    /** Whether external search is loading (for shouldFilter=false) */
    isLoading?: boolean;
    /** Custom class for the content panel */
    class?: string;
  }

  let {
    open = $bindable(false),
    placeholder = 'Search…',
    emptyMessage = 'No results found',
    shouldFilter = true,
    loop = true,
    vimBindings = true,
    onOpenChange,
    onValueChange,
    value = $bindable(''),
    groups = [],
    item,
    loading,
    isLoading = false,
    class: className = '',
  }: Props = $props();

  function handleOpenChange(isOpen: boolean) {
    open = isOpen;
    onOpenChange?.(isOpen);

    // Clear value when closing
    if (!isOpen) {
      value = '';
    }
  }

  function handleValueChange(newValue: string) {
    value = newValue;
    onValueChange?.(newValue);
  }

  function handleSelect(option: CommandPaletteOption) {
    option.onselect?.();
  }
</script>

<DialogPrimitive.Root bind:open onOpenChange={handleOpenChange}>
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      class="fixed inset-0 z-50 bg-black/10 backdrop-blur-sm data-[state=open]:animate-in
      data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
      transparency-reduce:backdrop-blur-0 transparency-reduce:bg-black/70"
    />

    <DialogPrimitive.Content
      class="fixed top-[15%] left-1/2 z-50 w-full max-w-xl -translate-x-1/2 rounded-xl bg-white/75 shadow-2xl
      dark:bg-gray-900/85 backdrop-blur-lg backdrop-saturate-200 dark:text-gray-100 data-[state=open]:animate-in
      data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
      data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2
      data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2
      data-[state=open]:slide-in-from-top-[48%] {className}"
    >
      <DialogPrimitive.Title class="sr-only">
        Search
      </DialogPrimitive.Title>
      <DialogPrimitive.Description class="sr-only">
        Type to search. Use arrow keys to navigate results and Enter to select.
      </DialogPrimitive.Description>

      <CommandPrimitive.Root
        {shouldFilter}
        {loop}
        {vimBindings}
        class="flex h-full w-full flex-col overflow-hidden"
      >
        <div class="flex items-center gap-2 border-b border-gray-200 ps-4 pe-2 dark:border-gray-800">
          <SearchIcon class="size-5 shrink-0 text-gray-500 dark:text-gray-600" />

          <CommandPrimitive.Input
            {placeholder}
            bind:value
            oninput={(event) => handleValueChange((event.target as HTMLInputElement).value)}
            class="flex h-12 w-full bg-transparent text-base outline-none placeholder:text-gray-500
            disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-gray-500"
          />

          {#if value}
            <Button
              icon
              variant="subtle"
              onclick={() => handleValueChange('')}
              aria-label="Clear search"
            >
              <XIcon class="size-4" />
            </Button>
          {/if}
        </div>

        <CommandPrimitive.List class="max-h-75 overflow-y-auto overflow-x-hidden p-2">
          {#if isLoading && loading}
            <div class="py-6 text-center text-sm text-gray-500">
              {@render loading()}
            </div>
          {:else}
            <CommandPrimitive.Empty class="py-6 text-center text-sm text-gray-500">
              {emptyMessage}
            </CommandPrimitive.Empty>

            {#each groups as group (group.id)}
              {#if group.items.length > 0}
                <CommandPrimitive.Group>
                  {#if group.heading}
                    <CommandPrimitive.GroupHeading
                      class="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >
                      {group.heading}
                    </CommandPrimitive.GroupHeading>
                  {/if}

                  <CommandPrimitive.GroupItems>
                    {#each group.items as option (option.id)}
                      {#if option.href}
                        <CommandPrimitive.LinkItem
                          value={option.filterValue ?? option.title}
                          href={option.href}
                          onSelect={() => handleSelect(option)}
                          class="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm
                          text-gray-700 outline-hidden aria-selected:bg-white aria-selected:ring-gray-200 ring
                          ring-transparent dark:text-gray-300 dark:aria-selected:bg-gray-800 transition
                          dark:aria-selected:ring-gray-700"
                        >
                          {#if item}
                            {@render item(option, group)}
                          {:else}
                            {#if option.icon}
                              <Icon name={option.icon} class="shrink-0 opacity-75" />
                            {/if}
                            <span class="flex-1">{option.title}</span>
                            {#if option.subtitle}
                              <span class="text-xs text-gray-500 dark:text-gray-400">
                                {option.subtitle}
                              </span>
                            {/if}
                          {/if}
                        </CommandPrimitive.LinkItem>
                      {:else}
                        <CommandPrimitive.Item
                          value={option.filterValue ?? option.title}
                          onSelect={() => handleSelect(option)}
                          class="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm
                          text-gray-700 outline-hidden aria-selected:bg-white aria-selected:ring-gray-200 ring
                          ring-transparent dark:text-gray-300 dark:aria-selected:bg-gray-800 transition
                          dark:aria-selected:ring-gray-700"
                        >
                          {#if item}
                            {@render item(option, group)}
                          {:else}
                            {#if option.icon}
                              <Icon name={option.icon} class="shrink-0 opacity-75" />
                            {/if}
                            <span class="flex-1">{option.title}</span>
                            {#if option.subtitle}
                              <span class="text-xs text-gray-500 dark:text-gray-400">
                                {option.subtitle}
                              </span>
                            {/if}
                          {/if}
                        </CommandPrimitive.Item>
                      {/if}
                    {/each}
                  </CommandPrimitive.GroupItems>
                </CommandPrimitive.Group>
              {/if}
            {/each}
          {/if}
        </CommandPrimitive.List>

        <div
          class="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500
          dark:border-gray-800 dark:text-gray-500"
        >
          <div class="flex items-center gap-3">
            <span class="flex items-center gap-1">
              <kbd
                class="flex items-center rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-800"
              >
                <ArrowUpIcon class="size-3" />
              </kbd>
              <kbd
                class="flex items-center rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-800"
              >
                <ArrowDownIcon class="size-3" />
              </kbd>
              <span>navigate</span>
            </span>
            <span class="flex items-center gap-1">
              <kbd
                class="flex items-center rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-800"
              >
                <CornerDownLeftIcon class="size-3" />
              </kbd>
              <span>select</span>
            </span>
            <span class="flex items-center gap-1">
              <kbd class="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-800">
                esc
              </kbd>
              <span>close</span>
            </span>
          </div>
        </div>
      </CommandPrimitive.Root>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
</DialogPrimitive.Root>
