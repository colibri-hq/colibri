<script lang="ts">
  import { twMerge } from 'tailwind-merge';
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    active?: boolean;
    disabled?: boolean;
    children?: Snippet;
    onclick?: (event: MouseEvent) => unknown;
    onkeydown?: (event: KeyboardEvent) => unknown;
    onkeypress?: (event: KeyboardEvent) => unknown;
    onkeyup?: (event: KeyboardEvent) => unknown;

    [key: string]: unknown;
  }

  let {
    label,
    active = false,
    disabled = false,
    children,
    onclick,
    onkeydown,
    onkeypress,
    onkeyup,
    ...rest
  }: Props = $props();

  const classList = $derived(twMerge(
    'size-8 flex justify-center items-center rounded-full leading-none p-2 transition group-first/pagination:ml-0 group-last/pagination:mr-0 mx-0.5',
    active
      ?
      'font-bold bg-black text-white dark:text-gray-300 shadow-lg'
      :
      'disabled:opacity-50 dark:disabled:opacity-25 disabled:pointer-events-none hover:bg-gray-200 dark:hover:bg-gray-800',
  ));
</script>

<button
  {...rest}
  aria-current={active ? 'true' : 'false'}
  aria-label={label}
  class={classList}
  {disabled}
  onclick={onclick}
  onkeydown={onkeydown}
  onkeypress={onkeypress}
  onkeyup={onkeyup}
  type="button"
>
  {@render children?.()}
</button>
