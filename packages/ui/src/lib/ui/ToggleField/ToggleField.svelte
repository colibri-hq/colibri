<script lang="ts">
  import type { Snippet } from 'svelte';
  import { twMerge } from 'tailwind-merge';
  import Toggle from '../Toggle/Toggle.svelte';

  interface Props {
    /**
     * Whether the toggle is checked.
     */
    checked?: boolean;

    /**
     * Additional class names for the field wrapper.
     */
    class?: string;

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
     * Whether the field is disabled.
     */
    disabled?: boolean;

    /**
     * The name attribute for form submission.
     */
    name?: string;

    /**
     * Size variant of the toggle.
     * @default 'medium'
     */
    size?: 'small' | 'medium' | 'large';

    /**
     * Called when the toggle state changes.
     */
    onCheckedChange?: (checked: boolean) => void;
  }

  let {
    checked = $bindable(false),
    class: className = '',
    label,
    hint,
    error,
    disabled = false,
    name,
    size = 'medium',
    onCheckedChange,
  }: Props = $props();

  const id = $props.id();

  const containerClasses = $derived(
    twMerge(
      'flex items-center justify-between gap-4 rounded-md px-2 py-2',
      'transition-colors',
      disabled ? 'opacity-50' : 'cursor-pointer',
      className,
    ),
  );
</script>

<div class={containerClasses}>
  <div class="flex min-w-0 flex-col">
    {#if typeof label === 'string'}
      <label class="select-none truncate text-sm text-gray-700 dark:text-gray-300" for={id}>
        {label}
      </label>
    {:else if label}
      {@render label()}
    {/if}

    {#if hint || error}
      <span class="mt-0.5 text-xs">
        {#if typeof error === 'string'}
          <span class="text-red-600 dark:text-red-400">{error}</span>
        {:else if error}
          {@render error()}
        {:else if typeof hint === 'string'}
          <span class="text-gray-500 dark:text-gray-400">{hint}</span>
        {:else if hint}
          {@render hint()}
        {/if}
      </span>
    {/if}
  </div>

  <Toggle
    bind:checked
    {disabled}
    {name}
    {onCheckedChange}
    {size}
  />
</div>
