<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ToggleField from './ToggleField.svelte';

  const { Story } = defineMeta({
    title: 'Components/ToggleField',
    component: ToggleField,
    tags: ['autodocs'],
    argTypes: {
      checked: {
        control: 'boolean',
        description: 'Whether the toggle is checked',
      },
      label: {
        control: 'text',
        description: 'Field label',
      },
      hint: {
        control: 'text',
        description: 'Hint text',
      },
      error: {
        control: 'text',
        description: 'Error message',
      },
      disabled: {
        control: 'boolean',
        description: 'Whether the field is disabled',
      },
      size: {
        control: 'select',
        options: ['small', 'medium', 'large'],
        description: 'Size variant',
      },
    },
  });
</script>

<Story name="Default">
  <div class="max-w-md">
    <ToggleField label="Enable notifications" />
  </div>
</Story>

<Story name="Checked">
  <div class="max-w-md">
    <ToggleField checked label="Dark mode" />
  </div>
</Story>

<Story name="With Hint">
  <div class="max-w-md">
    <ToggleField
      hint="Receive email updates about new features"
      label="Email notifications"
    />
  </div>
</Story>

<Story name="With Error">
  <div class="max-w-md">
    <ToggleField
      error="You must accept the terms to continue"
      label="Accept terms and conditions"
    />
  </div>
</Story>

<Story name="Disabled">
  <div class="max-w-md">
    <ToggleField
      disabled
      hint="This setting is managed by your administrator"
      label="Administrator setting"
    />
  </div>
</Story>

<Story name="Small Size">
  <div class="max-w-md">
    <ToggleField label="Compact toggle" size="small" />
  </div>
</Story>

<Story name="Settings List">
  <div class="max-w-md divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
    <ToggleField checked class="px-4 py-3" label="Push notifications" />
    <ToggleField class="px-4 py-3" label="Email notifications" />
    <ToggleField checked class="px-4 py-3" label="SMS alerts" />
    <ToggleField
      class="px-4 py-3"
      disabled
      hint="Coming soon"
      label="Desktop notifications"
    />
  </div>
</Story>
