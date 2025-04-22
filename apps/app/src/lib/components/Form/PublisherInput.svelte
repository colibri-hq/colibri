<script lang="ts">
  import AutocompleteInput from '$lib/components/Form/AutocompleteInput.svelte';
  import { trpc } from '$lib/trpc/client';
  import type { Publisher } from '@prisma/client';

  interface Props {
    name?: string;
    value: string | undefined;
    query?: string | undefined;
  }

  let {
    name = 'publisher',
    value = $bindable(),
    query = undefined,
  }: Props = $props();

  async function fetchSuggestions(term?: string): Promise<Publisher> {
    const publishers = await trpc().publishers.autocomplete.query(term);

    return publishers.map(({ id, name }) => ({ id, value: name }));
  }
</script>

<AutocompleteInput bind:value {name} {query} suggestions={fetchSuggestions} />
