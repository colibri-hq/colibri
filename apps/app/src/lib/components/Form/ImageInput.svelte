<script lang="ts">
  import { preventDefault, run, stopPropagation } from 'svelte/legacy';

  import Dropzone from '$lib/components/Form/Dropzone.svelte';
  import { Field } from '@colibri-hq/ui';
    import { Icon } from '@colibri-hq/ui';
  import { getImageDimensions } from '@colibri-hq/shared';

  interface Props {
    name?: string;
    label?: string;
    accept?: string;
    value?: File | undefined;
  }

  let {
    name = 'file',
    label = 'File',
    accept = 'image/*',
    value = $bindable(undefined),
  }: Props = $props();

  let previewImage: HTMLImageElement = $state();
  let inputElement: HTMLInputElement = $state();
  let hasPreview: boolean = $state(false);
  let width: number = $state(0);
  let height: number = $state(0);

  function handle(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    const file = target.files.item(0);
    value = file || undefined;
  }

  run(() => {
    if (previewImage) {
      if (value instanceof File) {
        previewImage.src = URL.createObjectURL(value);
        hasPreview = true;
        getImageDimensions(previewImage.src).then((dimensions) => {
          width = dimensions.width;
          height = dimensions.height;
        });
      } else if (typeof value === 'undefined') {
        previewImage.src = '';
        hasPreview = false;
      }
    }
  });

  // Use the DataTransfer object to update the file in the input element.
  // This usually belongs to the drag-n-drop API, but works here too.
  run(() => {
    if (inputElement && value instanceof File) {
      const container = new DataTransfer();
      container.items.add(value);
      inputElement.files = container.files;
    }
  });

  function clear() {
    value = undefined;
    inputElement.value = '';
    previewImage.src = '';
  }
</script>

<Field class="relative" {label}>
  {#snippet control()}
    <div class="contents">
      <input
        type="file"
        {accept}
        {name}
        bind:value
        bind:this={inputElement}
        class="hidden"
      />

      <Dropzone {accept} bind:file={value} class="order-2 mx-2 mb-2">
        {#snippet placeholder()}
          <div class="w-full">
            {#if !hasPreview}
              <div
                class="flex h-24 w-full items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800"
              >
                <Icon name="image" class="text-black dark:text-gray-400" />
              </div>
            {/if}

            <img
              bind:this={previewImage}
              src=""
              alt="Preview of the selected file"
              class="h-auto w-full rounded-md object-scale-down {hasPreview
                ? 'block'
                : 'hidden'}"
            />
          </div>
        {/snippet}
      </Dropzone>
    </div>
  {/snippet}

  <div class="append">
    {#if hasPreview}
      <button
        class="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-2xl backdrop-saturate-200"
        type="button"
        onclick={stopPropagation(preventDefault(clear))}
      >
        <Icon name="delete_forever" />
      </button>
    {/if}
  </div>

  {#snippet appendLabel()}
    <span>
      {#if hasPreview}
        {width}&thinsp;×&thinsp;{height}
      {/if}
    </span>
  {/snippet}
</Field>
