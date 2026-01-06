<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import FileInput from './FileInput.svelte';

  const { Story } = defineMeta({
    title: 'Components/FileInput',
    component: FileInput,
    tags: ['autodocs'],
    argTypes: {
      label: {
        control: 'text',
        description: 'Field label',
      },
      accept: {
        control: 'text',
        description: 'Accepted file types',
      },
      disabled: {
        control: 'boolean',
        description: 'Whether the input is disabled',
      },
      required: {
        control: 'boolean',
        description: 'Whether the input is required',
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
</script>

<Story name="Default">
  <div class="max-w-md">
    <FileInput
      label="Upload file"
      onFileSelect={(file) => console.log('Selected:', file)}
    />
  </div>
</Story>

<Story name="With Hint">
  <div class="max-w-md">
    <FileInput
      hint="Maximum file size: 10MB"
      label="Document"
    />
  </div>
</Story>

<Story name="With Error">
  <div class="max-w-md">
    <FileInput
      error="Please select a valid file"
      label="Attachment"
    />
  </div>
</Story>

<Story name="Required">
  <div class="max-w-md">
    <FileInput
      label="Required Document"
      required
    />
  </div>
</Story>

<Story name="Accept PDF">
  <div class="max-w-md">
    <FileInput
      accept=".pdf"
      hint="Only PDF files are accepted"
      icon="picture_as_pdf"
      label="PDF Document"
      placeholderText="Drag a PDF here"
    />
  </div>
</Story>

<Story name="Disabled">
  <div class="max-w-md">
    <FileInput
      disabled
      hint="File upload is currently disabled"
      label="Upload"
    />
  </div>
</Story>
