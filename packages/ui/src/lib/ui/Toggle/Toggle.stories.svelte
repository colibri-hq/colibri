<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Toggle from './Toggle.svelte';

  const { Story } = defineMeta({
    title: 'Components/Toggle',
    component: Toggle,
    tags: ['autodocs'],
    argTypes: {
      checked: {
        control: 'boolean',
        description: 'Whether the toggle is checked',
      },
      disabled: {
        control: 'boolean',
        description: 'Whether the toggle is disabled',
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
  <div class="flex items-center gap-4">
    <Toggle />
    <span class="text-sm text-gray-600 dark:text-gray-300">Toggle me</span>
  </div>
</Story>

<Story name="Checked">
  <div class="flex items-center gap-4">
    <Toggle checked />
    <span class="text-sm text-gray-600 dark:text-gray-300">Enabled</span>
  </div>
</Story>

<Story name="Sizes">
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-4">
      <Toggle size="small" />
      <span class="text-sm text-gray-600 dark:text-gray-300">Small</span>
    </div>
    <div class="flex items-center gap-4">
      <Toggle size="medium" />
      <span class="text-sm text-gray-600 dark:text-gray-300">Medium</span>
    </div>
    <div class="flex items-center gap-4">
      <Toggle size="large" />
      <span class="text-sm text-gray-600 dark:text-gray-300">Large</span>
    </div>
  </div>
</Story>

<Story name="Disabled">
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-4">
      <Toggle disabled />
      <span class="text-sm text-gray-600 dark:text-gray-300">Disabled (off)</span>
    </div>
    <div class="flex items-center gap-4">
      <Toggle checked disabled />
      <span class="text-sm text-gray-600 dark:text-gray-300">Disabled (on)</span>
    </div>
  </div>
</Story>

<Story name="Interactive">
  <div class="flex items-center gap-4">
    <Toggle
      onCheckedChange={(val) => console.log('Changed:', val)}
    />
    <span class="text-sm text-gray-600 dark:text-gray-300">
      Toggle to see console output
    </span>
  </div>
</Story>
