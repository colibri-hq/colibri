<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TextareaField from './TextareaField.svelte';

  const { Story } = defineMeta({
    title: 'Components/TextareaField',
    component: TextareaField,
    tags: ['autodocs'],
    argTypes: {
      value: {
        control: 'text',
        description: 'The current value of the textarea',
      },
      label: {
        control: 'text',
        description: 'Field label',
      },
      placeholder: {
        control: 'text',
        description: 'Placeholder text',
      },
      hint: {
        control: 'text',
        description: 'Hint text below the field',
      },
      error: {
        control: 'text',
        description: 'Error message',
      },
      disabled: {
        control: 'boolean',
        description: 'Whether the field is disabled',
      },
      readonly: {
        control: 'boolean',
        description: 'Whether the field is readonly',
      },
      required: {
        control: 'boolean',
        description: 'Whether the field is required',
      },
    },
  });
</script>

<Story name="Default">
  <div class="max-w-md">
    <TextareaField
      label="Description"
      name="description"
      placeholder="Enter a description..."
    />
  </div>
</Story>

<Story name="With Value">
  <div class="max-w-md">
    <TextareaField
      label="Bio"
      name="bio"
      value="This is my biography. I love writing code and building things."
    />
  </div>
</Story>

<Story name="Required">
  <div class="max-w-md">
    <TextareaField
      label="Summary"
      name="summary"
      placeholder="This field is required"
      required
    />
  </div>
</Story>

<Story name="With Hint">
  <div class="max-w-md">
    <TextareaField
      hint="Maximum 500 characters"
      label="Notes"
      name="notes"
      placeholder="Add your notes here..."
    />
  </div>
</Story>

<Story name="With Error">
  <div class="max-w-md">
    <TextareaField
      error="This field is required"
      label="Comments"
      name="comments"
      placeholder="Add comments..."
    />
  </div>
</Story>

<Story name="Disabled">
  <div class="max-w-md">
    <TextareaField
      disabled
      label="Archived Content"
      name="archived"
      value="This content cannot be edited"
    />
  </div>
</Story>

<Story name="Readonly">
  <div class="max-w-md">
    <TextareaField
      label="Legal Terms"
      name="terms"
      readonly
      value="These are the terms and conditions that cannot be modified."
    />
  </div>
</Story>

<Story name="Max Rows">
  <div class="max-w-md">
    <TextareaField
      label="Limited Textarea"
      maxRows={4}
      name="limited"
      placeholder="This will scroll after 4 rows..."
    />
  </div>
</Story>
