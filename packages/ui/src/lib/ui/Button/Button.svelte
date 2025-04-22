<script lang="ts">
  import { twMerge } from 'tailwind-merge';
  import type { Snippet } from 'svelte';
  import { Button, type ButtonRootProps } from 'bits-ui';

  type Props = ButtonRootProps & {
    class?: string | undefined;
    label?: string | undefined;

    icon?: boolean;
    size?: 'small' | 'medium' | 'large';
    variant?: 'subtle' | 'default' | 'primary' | 'ghost' | undefined;

    onClick?: (event: MouseEvent) => unknown;
    onKeydown?: (event: KeyboardEvent) => unknown;
    onKeypress?: (event: KeyboardEvent) => unknown;
    onKeyup?: (event: KeyboardEvent) => unknown;
    onSubmit?: (event: Event) => unknown;

    children?: Snippet;

    [key: string]: unknown;
  }

  let {
    class: className = undefined,
    label = undefined,
    variant = 'default',
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

  const ButtonRoot = Button.Root;
  const classList = $derived.by(() => twMerge(
    'flex items-center text-black dark:text-gray-300 font-bold ring-2 ring-gray-200 dark:ring-gray-700 bg-white ' +
    'dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800 rounded outline-none shadow focus-visible:ring-2 ' +
    'focus-visible:ring-blue-500 focus-visible:active:ring-blue-500 focus-visible:text-blue-950 ' +
    'dark:focus-visible:text-blue-50 active:bg-gray-200 dark:active:bg-gray-800/50 active:ring-gray-300 ' +
    'dark:active:ring-gray-500 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 ' +
    'dark:disabled:ring-gray-800 dark:disabled:text-gray-500 transition select-none cursor-pointer',
    {
      small: 'px-2 py-1 gap-1',
      medium: 'px-4 py-2 gap-2.5',
      large: 'px-6 py-3 gap-4',
    }[size],
    variant === 'subtle'
      ? 'bg-transparent hover:bg-gray-100 ring-0 ring-gray-100 hover:ring-2 disabled:ring-gray-200 ' +
      'dark:disabled:ring-gray-800 disabled:ring-2 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 ' +
      'hover:text-gray-800 dark:hover:text-gray-300 shadow-none'
      : undefined,
    icon
      ? 'grow-0 p-1 my-0 rounded-full justify-center size-8'
      : undefined,
    className,
  ));
</script>

<ButtonRoot
  {...rest}
  class={classList}
  onclick={onClick}
  onkeydown={onKeydown}
  onkeypress={onKeypress}
  onkeyup={onKeyup}
  onsubmit={onSubmit}
  role={'href' in rest ? 'link' : 'button'}
>
    {#if children}
      {@render children()}
    {:else}
      {label}
    {/if}
</ButtonRoot>
