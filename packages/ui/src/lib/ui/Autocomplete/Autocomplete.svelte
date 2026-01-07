<script lang="ts" generics="T extends { id: string; label: string }">
  import type { Snippet } from 'svelte';
  import { Combobox } from 'bits-ui';
  import { twMerge } from 'tailwind-merge';
  import Icon from '../Icon/Icon.svelte';

  interface Props {
    /**
     * The selected item ID.
     */
    value?: string;

    /**
     * The current input/search query.
     */
    query?: string;

    /**
     * Items to display in the dropdown.
     */
    items?: T[];

    /**
     * Additional class names for the container.
     */
    class?: string;

    /**
     * Content of the field label.
     */
    label?: string | Snippet;

    /**
     * Placeholder text for the input.
     */
    placeholder?: string;

    /**
     * Optional hint text to display below the field.
     */
    hint?: string | Snippet;

    /**
     * Optional error message to display below the field.
     */
    error?: string | Snippet;

    /**
     * The name attribute for form submission.
     */
    name?: string;

    /**
     * Whether the input is disabled.
     */
    disabled?: boolean;

    /**
     * Whether the input is required.
     */
    required?: boolean;

    /**
     * Whether items are currently loading.
     */
    loading?: boolean;

    /**
     * Custom item rendering.
     */
    itemSnippet?: Snippet<[{ item: T; selected: boolean; highlighted: boolean }]>;

    /**
     * Custom empty state rendering.
     */
    emptySnippet?: Snippet;

    /**
     * Called when the input query changes.
     */
    onQueryChange?: (query: string) => void;

    /**
     * Called when an item is selected.
     */
    onSelect?: (item: T | null) => void;
  }

  let {
    value = $bindable(undefined),
    query = $bindable(''),
    items = [],
    class: className = '',
    label,
    placeholder = 'Search...',
    hint,
    error,
    name,
    disabled = false,
    required = false,
    loading = false,
    itemSnippet,
    emptySnippet,
    onQueryChange,
    onSelect,
  }: Props = $props();
  const id = $props.id();

  let inputElement = $state<HTMLInputElement | null>(null);
  let open = $state(false);

  // Find the selected item from items
  const _selectedItem = $derived(items.find((item) => item.id === value) || null);

  function handleInputChange(event: Event) {
    const newQuery = (event.target as HTMLInputElement).value;
    query = newQuery;
    onQueryChange?.(newQuery);
  }

  function handleSelect(item: T | null) {
    if (item) {
      value = item.id;
      query = item.label;
    } else {
      value = undefined;
    }
    onSelect?.(item);
    open = false;
  }

  const containerClasses = $derived(
    twMerge('relative flex flex-col gap-1', className),
  );

  const inputClasses = $derived(
    twMerge(
      'w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition',
      'focus:ring-2 focus:ring-blue-500',
      'dark:bg-gray-950 dark:text-gray-100',
      error
        ? 'border-red-500 dark:border-red-400'
        : 'border-gray-300 dark:border-gray-700',
      disabled && 'cursor-not-allowed opacity-50',
    ),
  );

  const listClasses =
    'absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 ' +
    'bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900';

  const itemClasses = (highlighted: boolean, selected: boolean) =>
    twMerge(
      'relative flex cursor-pointer items-center gap-2 px-3 py-2 text-sm outline-none',
      highlighted && 'bg-blue-50 dark:bg-blue-900/30',
      selected && 'font-medium',
    );

  const _component = Combobox;
</script>

<div class={containerClasses}>
  {#if label}
    <div class="flex items-center justify-between px-1">
      {#if typeof label === 'string'}
        <label class="text-sm text-gray-600 dark:text-gray-400" for={id}>
          {label}
          {#if required}
            <span class="text-red-500">*</span>
          {/if}
        </label>
      {:else}
        {@render label()}
      {/if}
    </div>
  {/if}

  <Combobox.Root
    bind:open
    {disabled}
    onValueChange={(newValue) => {
      const selectedItem = items.find((item) => item.id === newValue) ?? null;
      handleSelect(selectedItem);
    }}
    type="single"
  >
    <div class="relative">
      <Combobox.Input
        bind:ref={inputElement}
        class={inputClasses}
        oninput={handleInputChange}
        {placeholder}
        {id}
        defaultValue={query}
      />

      <Combobox.Trigger
        class="absolute inset-y-0 right-0 flex items-center pr-2"
      >
        {#if loading}
          <Icon class="animate-spin text-gray-400" name="progress_activity" />
        {:else}
          <Icon class="text-gray-400" name="unfold_more" />
        {/if}
      </Combobox.Trigger>
    </div>

    <Combobox.Portal>
      <Combobox.Content class={listClasses}>
        {#if items.length === 0}
          {#if emptySnippet}
            {@render emptySnippet()}
          {:else}
            <div class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {loading ? 'Loading...' : 'No results found'}
            </div>
          {/if}
        {:else}
          {#each items as item (item.id)}
            <Combobox.Item
              class={itemClasses(false, value === item.id)}
              value={item.id}
              label={item.label}
            >
              {#snippet children({ selected })}
                {#if itemSnippet}
                  {@render itemSnippet({ item, selected, highlighted: false })}
                {:else}
                  {#if selected}
                    <Icon class="text-blue-600 dark:text-blue-400" name="check" />
                  {:else}
                    <span class="w-6"></span>
                  {/if}
                  <span class="truncate">{item.label}</span>
                {/if}
              {/snippet}
            </Combobox.Item>
          {/each}
        {/if}
      </Combobox.Content>
    </Combobox.Portal>
  </Combobox.Root>

  {#if name}
    <input {name} type="hidden" value={value ?? ''} />
  {/if}

  {#if hint || error}
    <div class="px-1 text-xs">
      {#if typeof error === 'string'}
        <span class="text-red-600 dark:text-red-400">{error}</span>
      {:else if error}
        {@render error()}
      {:else if typeof hint === 'string'}
        <span class="text-gray-500 dark:text-gray-400">{hint}</span>
      {:else if hint}
        {@render hint()}
      {/if}
    </div>
  {/if}
</div>
