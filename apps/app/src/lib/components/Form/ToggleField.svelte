<script lang="ts">
  import { Field } from '@colibri-hq/ui';
  import Toggle from '$lib/components/Form/Toggle.svelte';
  import { twMerge } from 'tailwind-merge';

  interface Props {
    class?: string;
    value?: boolean;
    label?: string;
    readonly?: boolean;

    [key: string]: any;
  }

  let {
    class: className = '',
    value = $bindable(false),
    label = '',
    readonly = false,
    ...rest
  }: Props = $props();

  const classList = twMerge(
    'bg-transparent dark:bg-transparent ring-0 shadow-none focus-within:ring-0 ' +
      'focus-within:shadow-none aria-disabled:bg-transparent',
    className,
  );
</script>

<Field {...rest} class={classList} {label} {readonly}>
  <!-- @migration-task: migrate this slot by hand, `label` would shadow a prop on the parent component -->
  <span
    class="max-w-[75%] shrink grow select-none overflow-hidden overflow-ellipsis whitespace-nowrap
    pr-2 text-base"
    slot="label">{label}</span
  >

  {#snippet control({ id: id, disabled: disabled })}
    <Toggle {id} {disabled} bind:value class="ml-auto mr-0 mt-1" />
  {/snippet}

  {#snippet messages({
    error,
    hint,
    attributes,
    errorAttributes,
    hintAttributes,
  })}
    <span
      class="-bottom-6 left-0 order-6 mt-1 w-full shrink-0 select-none overflow-hidden
      text-ellipsis whitespace-nowrap text-xs text-gray-500"
      {...attributes}
    >
      {#if error}
        <span {...errorAttributes}>{error}</span>
      {/if}

      {#if hint}
        <span {...hintAttributes}>{hint}</span>
      {/if}
    </span>
  {/snippet}
</Field>
