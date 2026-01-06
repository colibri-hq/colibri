<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import Field from '../Field/Field.svelte';
  import Textarea from '../Textarea/Textarea.svelte';

  interface Props extends Omit<HTMLTextareaAttributes, 'value'> {
    /**
     * The current value of the textarea.
     */
    value?: string;

    /**
     * Additional class names for the field wrapper.
     */
    class?: string;

    /**
     * Additional class names for the textarea element.
     */
    textareaClass?: string;

    /**
     * Content of the field label.
     */
    label?: string | Snippet;

    /**
     * Optional hint text to display below the field.
     */
    hint?: string | Snippet;

    /**
     * Optional error message to display below the field.
     */
    error?: string | Snippet;

    /**
     * Whether the field is required.
     */
    required?: boolean;

    /**
     * Whether to automatically grow the textarea based on content.
     * @default true
     */
    autoGrow?: boolean;

    /**
     * Minimum number of rows to display.
     * @default 2
     */
    minRows?: number;

    /**
     * Maximum number of rows before scrolling.
     */
    maxRows?: number;
  }

  let {
    value = $bindable(''),
    class: className = '',
    textareaClass = '',
    label,
    hint,
    error,
    required = false,
    disabled = false,
    readonly = false,
    autoGrow = true,
    minRows = 2,
    maxRows,
    name,
    placeholder,
    ...rest
  }: Props = $props();
</script>

{#snippet control({ id }: { id: string })}
  <Textarea
    {...rest}
    bind:value
    {autoGrow}
    class={textareaClass}
    {disabled}
    {id}
    {maxRows}
    {minRows}
    {name}
    {placeholder}
    {readonly}
  />
{/snippet}

<Field
  class={className}
  {control}
  {disabled}
  {error}
  {hint}
  {label}
  {name}
  {readonly}
  {required}
/>
