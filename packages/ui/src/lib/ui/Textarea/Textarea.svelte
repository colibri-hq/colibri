<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';

  interface Props extends Omit<HTMLTextareaAttributes, 'value'> {
    /**
     * The current value of the textarea.
     */
    value?: string;

    /**
     * Additional class names for the textarea.
     */
    class?: string;

    /**
     * Whether to automatically grow the textarea based on content.
     * @default true
     */
    autoGrow?: boolean;

    /**
     * Minimum number of rows to display.
     * @default 1
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
    autoGrow = true,
    minRows = 1,
    maxRows,
    disabled = false,
    readonly = false,
    rows: propsRows,
    ...rest
  }: Props = $props();

  let textarea = $state<HTMLTextAreaElement | null>(null);

  // Calculate rows based on content when autoGrow is enabled
  const contentRows = $derived.by(() => {
    if (!autoGrow || !value) return minRows;
    const lineCount = (value.match(/\n/g) || []).length + 1;
    return Math.max(lineCount, minRows);
  });

  // Apply maxRows constraint if specified
  const rows = $derived.by(() => {
    if (propsRows !== undefined) return propsRows;
    if (maxRows !== undefined) return Math.min(contentRows, maxRows);
    return contentRows;
  });

  const classList = $derived(
    twMerge(
      'w-full resize-none rounded-md border-none bg-transparent px-2 py-1 outline-none ring-0 ' +
        'focus-visible:ring-0 min-w-0',
      className,
    ),
  );
</script>

<textarea
  {...rest}
  bind:this={textarea}
  bind:value
  class={classList}
  {disabled}
  {readonly}
  {rows}
  tabindex={disabled || readonly ? -1 : 0}
></textarea>
