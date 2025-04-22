<script lang="ts">
  import AutocompleteInput from '$lib/components/Form/AutocompleteInput.svelte';
  import { trpc } from '$lib/trpc/client';
  import { page } from '$app/stores';

  interface Props {
    name?: string;
    label?: string | undefined;
    value: string | undefined;
    query?: string | undefined;
  }

  let {
    name = 'language',
    label = undefined,
    value = $bindable(),
    query = $bindable(undefined),
  }: Props = $props();

  async function fetchSuggestions(term: string) {
    const languages = await trpc($page).languages.autocomplete.query(term);

    return languages.map(({ iso_639_3, name }) => ({
      id: iso_639_3,
      value: name,
    }));
  }
</script>

<AutocompleteInput
  bind:query
  bind:value
  {label}
  {name}
  suggestions={fetchSuggestions}
/>
