<script lang="ts">
  import Icon from '../Icon/Icon.svelte';
  import type { Snippet } from 'svelte';
  import { twMerge } from 'tailwind-merge';
  import { Button, type ButtonRootProps } from 'bits-ui';

  type Props = ButtonRootProps & {
    label: string;
    icon: string | Snippet;
    active?: boolean;
    class?: string;
    [key: string]: unknown;
  };

  const {
    onClick,
    icon,
    active = false,
    label,
    class: className = '',
    ...rest
  }: Props = $props();

  const ButtonRoot = Button.Root;
</script>

<ButtonRoot
  {...rest}
  onclick={typeof onClick === 'function' ? (event: MouseEvent) => {
    event.preventDefault();
    onClick();
  } : undefined}
  aria-current={active ? 'page' : undefined}
  aria-label={label}
  role={'href' in rest ? 'link' : 'button'}
  class={twMerge(
    'dark:focus-visible:bg-gray-700 hidden rounded-md bg-white p-1.5 leading-none outline-0 transition ' +
    'cursor-pointer select-none hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:ring-2 ring ring-gray-300 ' +
     'md:flex items-center justify-center shadow-md dark:hover:bg-gray-700 text-gray-600 '+
     'aria-[current=page]:text-blue-500',
     className,
  )}
>
  {#if typeof icon === 'string'}
    <Icon name={icon} />
  {:else}
    {@render icon()}
  {/if}
</ButtonRoot>
