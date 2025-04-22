<script lang="ts">
  import { run } from 'svelte/legacy';

  import Dropzone from '$lib/components/Form/Dropzone.svelte';
  import { Field } from '@colibri-hq/ui';
  import { createEventDispatcher } from 'svelte';

  interface Props {
    name: string;
    accept?: string | undefined;
    value?: File | undefined;
    placeholder?: import('svelte').Snippet;
  }

  let {
    name,
    accept = undefined,
    value = $bindable(undefined),
    placeholder,
  }: Props = $props();
  let inputElement: HTMLInputElement = $state();

  const dispatch = createEventDispatcher<{ load: { file: File } }>();

  run(() => {
    if (value && inputElement) {
      const container = new DataTransfer();
      container.items.add(value);
      inputElement.files = container.files;
    }
  });

  function handleLoad(event: CustomEvent<{ file: File }>) {
    dispatch('load', event.detail);
  }

  const placeholder_render = $derived(placeholder);
</script>

<Field>
  {#snippet control()}
    <div class="contents">
      <input type="file" class="hidden" {name} bind:this={inputElement} />
      <Dropzone bind:file={value} {accept} on:load={handleLoad}>
        {#snippet placeholder()}
          {@render placeholder_render?.()}
        {/snippet}
      </Dropzone>
    </div>
  {/snippet}
</Field>
