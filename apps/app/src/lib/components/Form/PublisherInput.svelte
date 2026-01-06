<script lang="ts">
  import { Autocomplete } from '@colibri-hq/ui';
  import { trpc } from '$lib/trpc/client';

  interface Props {
    name?: string;
    label?: string | undefined;
    value?: string | undefined;
    query?: string | undefined;
  }

  let {
    name = 'publisher',
    label = undefined,
    value = $bindable(undefined),
    query = $bindable(''),
  }: Props = $props();

  let items = $state<Array<{ id: string; label: string }>>([]);
  let loading = $state(false);
  let debounceTimer = $state<ReturnType<typeof setTimeout> | null>(null);

  async function fetchSuggestions(term: string) {
    if (!term || term.length < 2) {
      items = [];
      return;
    }

    loading = true;
    try {
      const publishers = await trpc({} as any).publishers.autocomplete.query(term);
      items = publishers.map(({ id, name }) => ({ id, label: name }));
    } catch (error) {
      console.error(`Failed to fetch suggestions: ${(error as Error).message}`);
      items = [];
    } finally {
      loading = false;
    }
  }

  function handleQueryChange(newQuery: string) {
    query = newQuery;

    // Clear the value if user modifies the query
    if (items.find((item) => item.id === value)?.label !== newQuery) {
      value = undefined;
    }

    // Debounce the search
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      fetchSuggestions(newQuery);
    }, 250);
  }

  function handleSelect(item: { id: string; label: string } | null) {
    if (item) {
      value = item.id;
      query = item.label;
    }
  }
</script>

<Autocomplete
  bind:query
  bind:value
  {items}
  {label}
  {loading}
  {name}
  onQueryChange={handleQueryChange}
  onSelect={handleSelect}
  placeholder="Search publishers…"
/>
