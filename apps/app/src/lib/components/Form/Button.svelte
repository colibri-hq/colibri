<script lang="ts">
  import { twMerge } from 'tailwind-merge';
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string | undefined;
    label?: string | undefined;
    href?: string | undefined;
    type?: 'button' | 'submit';
    disabled?: boolean;
    subtle?: boolean;
    icon?: boolean;
    size?: 'small' | 'medium' | 'large';

    onClick?: (event: Event) => unknown;
    onKeydown?: (event: Event) => unknown;
    onKeypress?: (event: Event) => unknown;
    onKeyup?: (event: Event) => unknown;
    onSubmit?: (event: Event) => unknown;

    children?: Snippet;

    [key: string]: unknown;
  }

  let {
    class: className = undefined,
    label = undefined,
    href = undefined,
    type = 'button',
    disabled = false,
    subtle = false,
    size = 'medium',
    icon = false,

    onClick = undefined,
    onKeydown = undefined,
    onKeypress = undefined,
    onKeyup = undefined,
    onSubmit = undefined,

    children,
    ...rest
  }: Props = $props();

  let tag = href ? 'a' : 'button';
  const classList = $derived.by(() => twMerge(
    'text-black dark:text-gray-300 font-bold ring-2 ring-gray-200 dark:ring-gray-700 bg-white dark:bg-black ' +
    'hover:bg-gray-100 dark:hover:bg-gray-800 rounded outline-none shadow focus-visible:ring-2 ' +
    'focus-visible:ring-blue-500 focus-visible:active:ring-blue-500 focus-visible:text-blue-950 ' +
    'dark:focus-visible:text-blue-50 active:bg-gray-200 dark:active:bg-gray-800/50 active:ring-gray-300 ' +
    'dark:active:ring-gray-500 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 ' +
    'dark:disabled:ring-gray-800 dark:disabled:text-gray-500 transition select-none',
    {
      small: 'px-2 py-1 has-[.icon]:pl-1',
      medium: 'px-4 py-2 has-[.icon]:pl-2.5',
      large: 'px-6 py-3 has-[.icon]:pl-4',
    }[size],
    subtle
      ? 'bg-transparent hover:bg-gray-100 ring-0 ring-gray-100 hover:ring-2 disabled:ring-gray-200 ' +
      'dark:disabled:ring-gray-800 disabled:ring-2 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 ' +
      'hover:text-gray-800 dark:hover:text-gray-300 shadow-none'
      : undefined,
    icon
      ? 'flex grow-0 p-1 my-0 rounded-full justify-center items-center w-8 h-8'
      : undefined,
    className,
  ));
</script>

<svelte:element
  this={tag}
  {...{
    href: tag === 'a' ? href : undefined,
    type: tag === 'button' ? type : undefined,
    disabled: tag === 'button' ? disabled : undefined,
  }}
  {...rest}
  class={classList}
  onclick={onClick}
  onkeydown={onKeydown}
  onkeypress={onKeypress}
  onkeyup={onKeyup}
  onsubmit={onSubmit}
  role={tag === 'button' ? 'button' : 'link'}
>
  <div
    class="flex items-center {size === 'large' ? '[&_.icon]:mr-2.5' : '[&_.icon]:mr-1.5'}"
  >
    {#if children}
      {@render children()}
    {:else}
      {label}
    {/if}
  </div>
</svelte:element>
