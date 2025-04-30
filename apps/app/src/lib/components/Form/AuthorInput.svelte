<script lang="ts">
  import AutocompleteInput from '$lib/components/Form/AutocompleteInput.svelte';
  import { Icon } from '@colibri-hq/ui';
  import { trpc } from '$lib/trpc/client';
  import type { Author } from '@prisma/client';
  import type { SvelteComponentTyped } from 'svelte';

  interface Props {
    name?: string;
    label?: string | undefined;
    value: string | undefined;
    query?: string | undefined;
  }

  let {
    name = 'author',
    label = undefined,
    value = $bindable(),
    query = $bindable(undefined),
  }: Props = $props();

  let input: SvelteComponentTyped & { updateQuery(term?: string) } = $state();

  async function fetchSuggestions(term): Promise<Author> {
    const authors = await trpc().authors.autocomplete.query(term);

    return authors.map(({ id, name }) => ({ id, value: name }));
  }

  const nameOrderRegex = /([^,]+?)\s*,\s+([^,]+)$/;
  let fixedName: string | undefined = $derived(
    nameFixable
      ? (query as string).replace(nameOrderRegex, '$2 $1')
      : undefined,
  );
  let nameFixable: boolean = $derived(nameOrderRegex.test(query || ''));
</script>

<AutocompleteInput
  bind:query
  bind:this={input}
  bind:value
  {label}
  {name}
  suggestions={fetchSuggestions}
/>
{#if nameFixable}
  <div
    class="flex cursor-pointer items-center justify-end pt-1 text-xs text-blue-500 select-none"
    onclick={() => input.updateQuery(fixedName)}
  >
    <Icon name="lightbulb" class="mr-1 text-sm" />
    <span class="text-blue-500 underline">Use “{fixedName}” instead</span>
  </div>
{/if}
