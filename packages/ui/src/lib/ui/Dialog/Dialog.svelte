<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onDestroy } from 'svelte';
  import { Portal } from '../Portal/index.js';
  import { clickOutside } from '../../utilities.js';
  import { Icon } from '../Icon/index.js';

  interface Props {
    /** Custom classes for the content container */
    class?: string;
    /** Controls dialog visibility (bindable) */
    open?: boolean;
    /** Reference to the dialog element (bindable) */
    ref?: HTMLDialogElement | null;
    /** Dialog title - string or snippet for rich content */
    title?: string | Snippet;
    /** Optional description - string or snippet for rich content */
    description?: string | Snippet;
    /** Main dialog content */
    children?: Snippet;
    /** Footer content (typically action buttons) */
    footer?: Snippet;
    /** Called when dialog closes */
    onClose?: () => void;
    /** Called on any open state change */
    onOpenChange?: (open: boolean) => void;
    /** Width preset or custom class */
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | string;
    /** Show close button in header */
    showCloseButton?: boolean;
    /** Close when clicking outside the dialog */
    closeOnClickOutside?: boolean;
    /** Close when pressing Escape key */
    closeOnEscape?: boolean;
  }

  let {
    class: className = '',
    open = $bindable(false),
    ref = $bindable(null),
    title,
    description,
    children,
    footer,
    onClose,
    onOpenChange,
    maxWidth = 'md',
    showCloseButton = true,
    closeOnClickOutside = true,
    closeOnEscape = true,
  }: Props = $props();

  // Width class mapping
  const widthClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-[calc(100%-2rem)]',
  };

  let widthClass = $derived(widthClasses[maxWidth] ?? maxWidth);

  // Handle dialog open/close and body scroll lock
  $effect(() => {
    if (typeof window !== 'undefined') {
      window.document.body.style.overflow = open ? 'hidden' : '';

      if (open) {
        ref?.showModal();
      } else {
        ref?.close();
      }

      onOpenChange?.(open);
    }
  });

  // Cleanup on destroy
  if (typeof document !== 'undefined') {
    onDestroy(() => {
      window.document.body.style.overflow = '';

      if (window.document.activeElement) {
        (window.document.activeElement as HTMLElement).focus();
      }
    });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!open || !ref) {
      return;
    }

    const { key } = event;

    if (key === 'Escape') {
      if (closeOnEscape) {
        event.preventDefault();
        close();
      }
      return;
    }

    if (key === 'Tab') {
      // Trap focus within the dialog
      const nodes = ref.querySelectorAll('*') as NodeListOf<HTMLElement>;
      const tabbable = Array.from(nodes).filter((n) => n.tabIndex >= 0);

      let index = window.document.activeElement
        ? tabbable.indexOf(window.document.activeElement as HTMLElement)
        : -1;

      if (index === -1 && event.shiftKey) {
        index = 0;
      }

      index += tabbable.length + (event.shiftKey ? -1 : 1);
      index %= tabbable.length;

      tabbable[index]?.focus();
      event.preventDefault();
    }
  }

  function handleClickOutside() {
    if (closeOnClickOutside) {
      close();
    }
  }

  export function close() {
    open = false;
    onClose?.();
  }

  // Check if a value is a Snippet (function)
  function isSnippet(value: unknown): value is Snippet {
    return typeof value === 'function';
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<Portal>
  <dialog
    bind:this={ref}
    class="fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 transform-gpu
      rounded-xl bg-white p-0 shadow-xl will-change-auto
      backdrop:pointer-events-none backdrop:bg-black/50 backdrop:backdrop-blur-sm
      dark:bg-gray-900 dark:text-gray-100
      transparency-reduce:backdrop:backdrop-blur-0 transparency-reduce:backdrop:bg-white
      transparency-reduce:dark:backdrop:bg-black
      {widthClass}"
    onclickoutside={handleClickOutside}
    use:clickOutside
  >
    <div class="flex flex-col">
      <!-- Header -->
      {#if title || showCloseButton}
        <header class="flex items-start justify-between gap-4 p-6 pb-0">
          {#if title}
            <div class="flex-1">
              {#if isSnippet(title)}
                <h2 class="text-lg font-semibold">
                  {@render title()}
                </h2>
              {:else}
                <h2 class="text-lg font-semibold">{title}</h2>
              {/if}

              {#if description}
                <div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {#if isSnippet(description)}
                    {@render description()}
                  {:else}
                    <p>{description}</p>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}

          {#if showCloseButton}
            <button
              aria-label="Close dialog"
              class="flex shrink-0 items-center justify-center rounded-full p-1.5
                text-gray-500 ring-blue-500 transition outline-none
                hover:bg-gray-100 hover:text-gray-700
                focus-visible:ring-2
                dark:hover:bg-gray-800 dark:hover:text-gray-300"
              onclick={close}
              type="button"
            >
              <Icon class="text-xl leading-none" name="close" />
            </button>
          {/if}
        </header>
      {/if}

      <!-- Content -->
      <div class="p-6 {className}">
        {@render children?.()}
      </div>

      <!-- Footer -->
      {#if footer}
        <footer class="border-t border-gray-200 p-6 pt-4 dark:border-gray-800">
          {@render footer()}
        </footer>
      {/if}
    </div>
  </dialog>
</Portal>
