<script lang="ts">
  import Icon from '../Icon/Icon.svelte';
  import { twMerge } from 'tailwind-merge';
  import { Button, type ButtonRootProps } from 'bits-ui';

  type Props = ButtonRootProps & {
    label?: string;
    unreadCount?: number;
    active?: boolean;
    class?: string;
    onClick?: () => unknown;
    [key: string]: unknown;
  };

  const {
    onClick,
    unreadCount = 0,
    active = false,
    label = 'Notifications',
    class: className = '',
    ...rest
  }: Props = $props();

  const ButtonRoot = Button.Root;
  const showBadge = $derived(unreadCount > 0);
  const badgeText = $derived(unreadCount > 99 ? '99+' : unreadCount.toString());
</script>

<ButtonRoot
  {...rest}
  onclick={typeof onClick === 'function' ? (event: MouseEvent) => {
    event.preventDefault();
    onClick();
  } : undefined}
  aria-label={label}
  aria-current={active ? 'page' : undefined}
  role="button"
  class={twMerge(
    'relative hidden rounded-md bg-white dark:bg-black p-1.5 leading-none outline-0 transition ' +
    'cursor-pointer select-none hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:ring-2 ring ring-gray-300 ' +
    'dark:ring-gray-800 md:flex items-center justify-center shadow-md dark:hover:bg-gray-700 text-gray-600 ' +
    'dark:focus-visible:bg-gray-700 aria-[current=page]:text-blue-500',
    className,
  )}
>
  <Icon name="notifications" />

  {#if showBadge}
    <span
      class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full
             bg-red-500 px-1 text-xs font-bold text-white"
      aria-label="{unreadCount} unread notifications"
    >
      {badgeText}
    </span>
  {/if}
</ButtonRoot>
