<script lang="ts">
  import { createBubbler } from 'svelte/legacy';
  import { twMerge } from 'tailwind-merge';

  const bubble = createBubbler();

  interface Props {
    label: string;
    active?: boolean;
    disabled?: boolean;
    children?: import('svelte').Snippet;

    [key: string]: any;
  }

  let {
    label,
    active = false,
    disabled = false,
    children,
    ...rest
  }: Props = $props();

  const classList = twMerge(
    'w-8 h-8 flex justify-center items-center rounded-full leading-none p-2 transition ' +
      'group-first/pagination:ml-0 group-last/pagination:mr-0 mx-0.5',
    active
      ? 'font-bold bg-black text-white dark:text-gray-300 shadow-lg'
      : 'disabled:opacity-50 dark:disabled:opacity-25 disabled:pointer-events-none hover:bg-gray-200 dark:hover:bg-gray-800',
  );
</script>

<button
  {...rest}
  aria-current={active ? 'true' : 'false'}
  aria-label={label}
  class={classList}
  {disabled}
  onclick={bubble('click')}
  onkeydown={bubble('keydown')}
  onkeypress={bubble('keypress')}
  onkeyup={bubble('keyup')}
  type="button"
>
  {@render children?.()}
</button>
