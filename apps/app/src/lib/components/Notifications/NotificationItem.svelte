<script lang="ts">
  import { Icon } from '@colibri-hq/ui';
  import type { Notification } from '$lib/notifications';

  interface Props {
    notification: Notification;
    onRead?: () => void;
  }

  let { notification, onRead }: Props = $props();

  const iconMap: Record<string, string> = {
    info: 'info',
    success: 'check_circle',
    warning: 'warning',
    error: 'error',
  };

  const colorMap: Record<string, string> = {
    info: 'text-blue-500',
    success: 'text-green-500',
    warning: 'text-amber-500',
    error: 'text-red-500',
  };

  const timeAgo = $derived(formatTimeAgo(notification.timestamp));

  function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
</script>

<button
  class="flex w-full gap-3 px-4 py-3 text-left transition hover:bg-gray-50
         dark:hover:bg-gray-800/50 {!notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}"
  onclick={onRead}
>
  <Icon name={iconMap[notification.level]} class="{colorMap[notification.level]} mt-0.5" />

  <div class="flex-1 min-w-0">
    <p class="text-gray-900 dark:text-gray-100 {!notification.read ? 'font-semibold' : 'font-medium'}">
      {notification.title}
    </p>
    {#if notification.message}
      <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
        {notification.message}
      </p>
    {/if}
    <p class="text-xs text-gray-400 mt-1">{timeAgo}</p>
  </div>

  {#if !notification.read}
    <span class="h-2 w-2 rounded-full bg-blue-500 mt-2"></span>
  {/if}
</button>
