<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Autocomplete from './Autocomplete.svelte';

  const { Story } = defineMeta({
    title: 'Components/Autocomplete',
    component: Autocomplete,
    tags: ['autodocs'],
    argTypes: {
      label: {
        control: 'text',
        description: 'Field label',
      },
      placeholder: {
        control: 'text',
        description: 'Input placeholder',
      },
      disabled: {
        control: 'boolean',
        description: 'Whether the input is disabled',
      },
      required: {
        control: 'boolean',
        description: 'Whether the input is required',
      },
      loading: {
        control: 'boolean',
        description: 'Loading state',
      },
      hint: {
        control: 'text',
        description: 'Hint text',
      },
      error: {
        control: 'text',
        description: 'Error message',
      },
    },
  });

  const countries = [
    { id: 'us', label: 'United States' },
    { id: 'uk', label: 'United Kingdom' },
    { id: 'de', label: 'Germany' },
    { id: 'fr', label: 'France' },
    { id: 'jp', label: 'Japan' },
    { id: 'au', label: 'Australia' },
    { id: 'ca', label: 'Canada' },
    { id: 'br', label: 'Brazil' },
  ];
</script>

<Story name="Default">
  <div class="max-w-md">
    <Autocomplete
      items={countries}
      label="Country"
      placeholder="Select a country..."
    />
  </div>
</Story>

<Story name="With Selection">
  <div class="max-w-md">
    <Autocomplete
      items={countries}
      label="Country"
      query="Germany"
      value="de"
    />
  </div>
</Story>

<Story name="Loading">
  <div class="max-w-md">
    <Autocomplete
      items={[]}
      label="Search"
      loading
      placeholder="Searching..."
    />
  </div>
</Story>

<Story name="With Hint">
  <div class="max-w-md">
    <Autocomplete
      hint="Start typing to search for countries"
      items={countries}
      label="Country"
    />
  </div>
</Story>

<Story name="With Error">
  <div class="max-w-md">
    <Autocomplete
      error="Please select a valid country"
      items={countries}
      label="Country"
    />
  </div>
</Story>

<Story name="Required">
  <div class="max-w-md">
    <Autocomplete
      items={countries}
      label="Country"
      required
    />
  </div>
</Story>

<Story name="Disabled">
  <div class="max-w-md">
    <Autocomplete
      disabled
      items={countries}
      label="Country"
      query="France"
      value="fr"
    />
  </div>
</Story>

<Story name="Interactive Search">
  <div class="max-w-md">
    <Autocomplete
      items={countries}
      label="Country"
      onQueryChange={(q) => console.log('Query:', q)}
      onSelect={(item) => console.log('Selected:', item)}
      placeholder="Type to search..."
    />
    <p class="mt-2 text-sm text-gray-500">Query and selection will be logged to the console.</p>
  </div>
</Story>
