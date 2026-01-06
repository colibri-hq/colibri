<script lang="ts">
  import { Button, Icon } from '@colibri-hq/ui';
  import { fade, fly } from 'svelte/transition';
  import { quintIn, quintOut } from 'svelte/easing';
  import { clearHistory, markAllAsRead, markAsRead, notifications } from '$lib/notifications';
  import NotificationItem from './NotificationItem.svelte';
  import type { Snippet } from 'svelte';
  import { browser } from '$app/environment';

  interface Props {
    open?: boolean;
    trigger?: Snippet<[{ open: boolean }]>;
  }

  let { open = $bindable(false), trigger }: Props = $props();

  const sortedNotifications = $derived(
    [...$notifications].sort((a, b) => b.timestamp - a.timestamp),
  );
  const hasNotifications = $derived(sortedNotifications.length > 0);
  const hasUnread = $derived(sortedNotifications.some((n) => !n.read));

  function handleBackdropClick() {
    open = false;
  }

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') {
      event.preventDefault();
      open = false;
    }
  }

  // Lock body scroll when drawer is open
  $effect(() => {
    if (browser) {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Trigger button -->
{#if trigger}
  {@render trigger({ open })}
{/if}

<!-- Drawer overlay and panel -->
{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
    in:fade={{ duration: 200 }}
    out:fade={{ duration: 250 }}
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
    role="presentation"
  >
    <!-- Drawer Panel -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl rounded-s-4xl
             dark:bg-gray-900 dark:ring dark:ring-gray-800"
      in:fly={{ x: 400, duration: 250, easing: quintOut }}
      out:fly={{ x: 400, duration: 200, easing: quintIn }}
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Notification center"
      tabindex="-1"
    >
      <div class="flex h-full flex-col">
        <!-- Header -->
        <header class="flex items-center justify-between ps-8 pe-4 py-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
          <div class="flex items-center gap-3">
            {#if hasUnread}
              <button
                class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                onclick={() => markAllAsRead()}
              >
                Mark all read
              </button>
            {/if}

            <Button onClick={() => (open = false)} icon aria-label="Close">
              <Icon name="close" />
            </Button>
          </div>
        </header>

        <!-- Notification List -->
        <div class="flex-1 overflow-y-auto">
          {#if hasNotifications}
            <ul class="divide-y divide-gray-100 dark:divide-gray-800">
              {#each sortedNotifications as notification, index (notification.id)}
                <!-- eslint-disable-next-line svelte/no-inline-styles -- Dynamic stagger delay -->
                <li style:animation-delay="{index * 30}ms" class="animate-in">
                  <NotificationItem {notification} onRead={() => markAsRead(notification.id)} />
                </li>
              {/each}
            </ul>
          {:else}
            <div class="flex h-full flex-col items-center justify-center py-16 text-gray-500">
              <Icon name="notifications_none" class="text-6xl mb-4 opacity-50" />
              <p class="text-lg font-medium">No notifications</p>
              <p class="text-sm text-gray-400 mt-1">You're all caught up!</p>
            </div>
          {/if}
        </div>

        <!-- Footer -->
        {#if hasNotifications}
          <footer class="border-t border-gray-200 px-6 py-3 dark:border-gray-800">
            <button
              class="w-full rounded-lg py-2 text-center text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700
                     dark:text-gray-400 dark:hover:bg-gray-800 cursor-pointer transition"
              onclick={() => clearHistory()}
            >
              Clear all notifications
            </button>
          </footer>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
    @keyframes fade-slide-in {
        from {
            opacity: 0;
            transform: translateX(1rem);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .animate-in {
        animation: fade-slide-in 200ms ease-out forwards;
        opacity: 0;
    }
</style>
