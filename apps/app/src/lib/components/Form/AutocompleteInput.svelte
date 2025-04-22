<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot making the component unusable -->
<script context="module" lang="ts">
  interface Entity {
    id: string;
    value: string;
  }

  // eslint-disable-next-line no-undef
  type T = $$Generic<Entity> & { id: string; value: string };
</script>

<script lang="ts">
  import { Field } from '@colibri-hq/ui';
  import { Icon } from '@colibri-hq/ui';
  import { onMount } from 'svelte';
  import { createCombobox } from 'svelte-headlessui';
  import { debounceTimer } from 'svelte-reactive-debounce';
  import { browser } from '$app/environment';

  export let value: string | undefined = undefined;
  export let query: string | undefined = undefined;
  export let label: string | undefined = undefined;
  export let name: string;
  export let suggestions: (term: string) => Promise<T[]>;
  export let debounce: number = 250;

  export function updateQuery(term?: string) {
    query = term;
    selection = term;
  }

  let items: Partial<T>[] = [
    // By placing the query in the initial item list, the combobox will be
    // populated when the component is rendered.
    // { id: "__none__", value: query || "" }
  ];
  let loading: boolean = false;
  let selection: string | undefined = value || query || undefined;

  const combobox = createCombobox({ label: name });

  function inputChange(event: Event) {
    selection = (event.target as HTMLInputElement).value;
  }

  function updateSelection(event: Event | CustomEvent<{ selected?: T }>) {
    if ('detail' in event && 'selected' in event.detail) {
      const { selected } = event.detail;
      selection = selected?.value;
      value = selected?.id;
    }
  }

  async function updateSuggestions(term?: string) {
    if (!term) {
      return;
    }

    loading = true;

    try {
      items = await suggestions(term);
    } catch (error) {
      console.error(`Failed to fetch suggestions: ${(error as Error).message}`);
    } finally {
      loading = false;
    }
  }

  /**
   * Memorizes the previous filter value to prevent unnecessary search queries
   */
  function applyFilter() {
    let previous: string | undefined = undefined;

    return async function applyFilter(filter?: string) {
      if (filter && filter !== previous) {
        await updateSuggestions(filter);

        previous = filter;
      }
    };
  }

  const timer = debounceTimer(debounce);
  const apply = applyFilter();

  // If the debounce timer is up, apply the current filter
  $: if (browser && $timer.up()) {
    apply($combobox.filter);
  }

  // Update the bound query if the selection changes
  $: if (selection) {
    query = selection;
  }

  // Remove the item ID if a suggestion is modified, thus yielding something new
  $: if (selection !== $combobox.selected?.value) {
    value = undefined;
  }

  // If the preloaded value is found in the item list, set its ID immediately
  onMount(async () => {
    if (query) {
      await updateSuggestions(query);
      const existing = items.find(({ value }) => value === query);

      if (existing) {
        value = existing.id;
      }
    }
  });
</script>

<Field bind:value class="relative" {label}>
  <svelte:fragment let:id slot="control">
    <input
      {id}
      on:change={inputChange}
      on:input={inputChange}
      on:select={updateSelection}
      use:combobox.input
      value={selection}
    />
  </svelte:fragment>

  <button
    class="absolute inset-y-0 right-0 flex h-full items-end pb-1 pr-1"
    type="button"
    use:combobox.button
  >
    {#if loading}
      <slot name="loading">
        <Icon class="text-xl text-gray-400">
          <slot name="loadingIcon">autorenew</slot>
        </Icon>
      </slot>
    {:else}
      <slot name="unfold">
        <Icon class="text-xl text-gray-400">
          <slot name="unfoldIcon">unfold_more</slot>
        </Icon>
      </slot>
    {/if}
  </button>

  <!--
  <Transition
    on:after-leave={() => combobox.reset()}
    show={$combobox.expanded}
    leave="transition ease-in duration-100"
    leaveFrom="opacity-100"
    leaveTo="opacity-0">
    -->
  {#if $combobox.expanded}
    <ul
      use:combobox.items
      class="absolute top-full z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white/50 py-1 text-base shadow-lg backdrop-blur-2xl backdrop-saturate-200 focus:outline-none sm:text-sm dark:bg-black/25"
    >
      {#each items as item}
        <li
          class="relative cursor-default select-none py-2 pl-10 pr-4 {$combobox
            .active?.id === item.id
            ? 'bg-blue-600/25 text-white backdrop-blur-2xl backdrop-saturate-200'
            : 'text-gray-900 dark:text-gray-400'}"
          use:combobox.item={{ value: item }}
        >
          <span
            class="block truncate {$combobox.selected?.id === item?.id
              ? 'font-medium'
              : 'font-normal'}"
          >
            <slot name="item" {item}>{item?.value}</slot>
          </span>

          {#if $combobox.selected?.id === item?.id}
            <span
              class="absolute inset-y-0 left-0 flex items-center pl-3 {$combobox
                .active?.id === item.id
                ? 'text-white'
                : 'text-blue-600'}"
            >
              <Icon class="h-5 w-5">
                <slot name="selectionIcon" {item}>check</slot>
              </Icon>
            </span>
          {/if}
        </li>
      {:else}
        <li
          class="relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900 dark:text-gray-300"
        >
          <slot name="noResults" {query}>
            <span class="block truncate font-normal">Nothing found</span>
          </slot>
        </li>
      {/each}
    </ul>
    <!--
  </Transition>
  -->
  {/if}

  <input {name} type="hidden" value={value ? value : ''} />
</Field>
