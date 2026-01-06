<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ImageInput from './ImageInput.svelte';

  const { Story } = defineMeta({
    title: 'Components/ImageInput',
    component: ImageInput,
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
      showDimensions: {
        control: 'boolean',
        description: 'Show image dimensions',
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
    <ImageInput
      label="Profile Picture"
      onImageSelect={(file) => console.log('Selected:', file)}
    />
  </div>
</Story>

<Story name="With Hint">
  <div class="max-w-md">
    <ImageInput
      hint="Recommended size: 400x400 pixels"
      label="Avatar"
    />
  </div>
</Story>

<Story name="With Error">
  <div class="max-w-md">
    <ImageInput
      error="Please select a valid image"
      label="Cover Image"
    />
  </div>
</Story>

<Story name="Required">
  <div class="max-w-md">
    <ImageInput
      label="Product Image"
      required
    />
  </div>
</Story>

<Story name="Without Dimensions">
  <div class="max-w-md">
    <ImageInput
      label="Thumbnail"
      showDimensions={false}
    />
  </div>
</Story>

<Story name="Disabled">
  <div class="max-w-md">
    <ImageInput
      disabled
      hint="Image upload is currently disabled"
      label="Banner"
    />
  </div>
</Story>

<Story name="Accept PNG Only">
  <div class="max-w-md">
    <ImageInput
      accept=".png"
      hint="Only PNG files are accepted"
      label="Logo"
    />
  </div>
</Story>
