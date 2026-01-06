<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Dropzone from './Dropzone.svelte';

  const { Story } = defineMeta({
    title: 'Components/Dropzone',
    component: Dropzone,
    tags: ['autodocs'],
    argTypes: {
      accept: {
        control: 'text',
        description: 'Accepted file types',
      },
      multiple: {
        control: 'boolean',
        description: 'Allow multiple files',
      },
      disabled: {
        control: 'boolean',
        description: 'Whether the dropzone is disabled',
      },
      placeholderText: {
        control: 'text',
        description: 'Placeholder text',
      },
      icon: {
        control: 'text',
        description: 'Placeholder icon name',
      },
    },
  });
</script>

<Story name="Default">
  <div class="max-w-md">
    <Dropzone
      onFilesSelect={(files) => console.log('Selected:', files)}
    />
  </div>
</Story>

<Story name="Accept Images">
  <div class="max-w-md">
    <Dropzone
      accept="image/*"
      icon="image"
      placeholderText="Drag an image here, or click to select"
    />
  </div>
</Story>

<Story name="Accept PDFs">
  <div class="max-w-md">
    <Dropzone
      accept=".pdf"
      icon="picture_as_pdf"
      placeholderText="Drag a PDF here, or click to select"
    />
  </div>
</Story>

<Story name="Multiple Files">
  <div class="max-w-md">
    <Dropzone
      multiple
      placeholderText="Drag files here, or click to select multiple"
    />
  </div>
</Story>

<Story name="Disabled">
  <div class="max-w-md">
    <Dropzone disabled />
  </div>
</Story>

<Story name="Custom Placeholder">
  <div class="max-w-md">
    <Dropzone>
      {#snippet placeholder()}
        <div class="flex flex-col items-center gap-3 py-8">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <span class="text-2xl text-blue-600 dark:text-blue-400">+</span>
          </div>
          <div class="text-center">
            <p class="font-medium text-gray-700 dark:text-gray-200">Upload your file</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">PNG, JPG up to 10MB</p>
          </div>
        </div>
      {/snippet}
    </Dropzone>
  </div>
</Story>

<Story name="With Selected Files">
  <div class="max-w-md space-y-4">
    <Dropzone
      multiple
      onFilesSelect={(files) => console.log('Selected:', files)}
    />
    <p class="text-sm text-gray-500">Selected files will be logged to the console.</p>
  </div>
</Story>
