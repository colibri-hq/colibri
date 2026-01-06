<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Textarea from './Textarea.svelte';

  const { Story } = defineMeta({
    title: 'Components/Textarea',
    component: Textarea,
    tags: ['autodocs'],
    argTypes: {
      value: {
        control: 'text',
        description: 'The current value of the textarea',
      },
      placeholder: {
        control: 'text',
        description: 'Placeholder text',
      },
      disabled: {
        control: 'boolean',
        description: 'Whether the textarea is disabled',
      },
      readonly: {
        control: 'boolean',
        description: 'Whether the textarea is readonly',
      },
      autoGrow: {
        control: 'boolean',
        description: 'Whether to automatically grow based on content',
      },
      minRows: {
        control: 'number',
        description: 'Minimum number of rows',
      },
      maxRows: {
        control: 'number',
        description: 'Maximum number of rows before scrolling',
      },
    },
  });
</script>

<Story name="Default">
  <div class="max-w-md">
    <Textarea placeholder="Type something..." />
  </div>
</Story>

<Story name="With Value">
  <div class="max-w-md">
    <Textarea value="This is some text content in the textarea." />
  </div>
</Story>

<Story name="Auto Grow">
  <div class="max-w-md">
    <Textarea
      placeholder="Type multiple lines to see it grow..."
      value="Line 1
Line 2
Line 3"
    />
  </div>
</Story>

<Story name="Max Rows">
  <div class="max-w-md">
    <Textarea
      maxRows={3}
      placeholder="Limited to 3 rows..."
      value="Line 1
Line 2
Line 3
Line 4
Line 5"
    />
  </div>
</Story>

<Story name="Disabled">
  <div class="max-w-md">
    <Textarea disabled placeholder="Disabled textarea" value="Cannot edit this" />
  </div>
</Story>

<Story name="Readonly">
  <div class="max-w-md">
    <Textarea readonly value="This is readonly content" />
  </div>
</Story>

<Story name="With Styling">
  <div class="max-w-md">
    <Textarea
      class="rounded-xl border border-gray-300 bg-gray-50 p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900"
      placeholder="Styled textarea..."
    />
  </div>
</Story>
