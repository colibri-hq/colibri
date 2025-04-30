<script lang="ts">
  import { run } from 'svelte/legacy';
  import { onDestroy } from 'svelte';
  import Portal from '$lib/components/Portal.svelte';
  import { clickOutside } from '$lib/utilities';
  import { browser } from '$app/environment';
  import { Icon } from '@colibri-hq/ui';

  interface Props {
    class?: string;
    open?: boolean;
    onClose?: () => unknown;
    header?: import('svelte').Snippet;
    children?: import('svelte').Snippet;
  }

  let {
    class: className = '',
    open = $bindable(false),
    header,
    children,
    onClose,
  }: Props = $props();
  let dialog: HTMLDialogElement | undefined = $state();

  run(() => {
    if (browser) {
      window.document.body.style.overflow = open ? 'hidden' : '';

      if (open) {
        dialog?.showModal();
      } else {
        dialog?.close();
      }
    }
  });

  if (typeof document !== 'undefined') {
    onDestroy(() => {
      window.document.body.style.overflow = '';

      if (window.document.activeElement) {
        (window.document.activeElement as HTMLElement).focus();
      }
    });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!open || !dialog) {
      return;
    }

    const { key } = event;

    if (key === 'Escape') {
      return close();
    }

    if (key === 'Tab') {
      // trap focus
       
      const nodes = dialog.querySelectorAll('*') as NodeListOf<HTMLElement>;
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

  export function close() {
    open = false;
    onClose?.();
  }

  //
  // if (import.meta.hot) {
  //   import.meta.hot.accept(() => {
  //     close();
  //   });
  // }
</script>

<svelte:window onkeydown={handleKeydown} />

<Portal>
  <dialog
    bind:this={dialog}
    class="transparency-reduce:backdrop:backdrop-blur-0 mt-[5vh] max-h-[calc(100%_-_5vh_-_2rem)] max-w-[calc(100%_-_4rem)] transform-gpu rounded-3xl
    bg-white shadow-xl will-change-auto backdrop:pointer-events-none
    backdrop:bg-black/30 backdrop:backdrop-blur dark:bg-gray-950
    dark:text-gray-100 dark:backdrop:bg-white/5 transparency-reduce:backdrop:bg-white
    transparency-reduce:dark:backdrop:bg-black"
    onclickOutside={close}
    use:clickOutside
  >
    <header
      class="sticky top-0 z-10 flex min-w-72 items-center justify-between border-b
      bg-white/80 pt-2 pr-2 pb-1 pl-4 shadow-sm backdrop-blur dark:border-b-gray-900 dark:bg-black/70"
    >
      <div>
        {@render header?.()}
      </div>

      <button
        aria-label="Close the dialog"
        class="flex items-center justify-center rounded-full bg-gray-50 p-2 ring-blue-500
        transition outline-none hover:bg-gray-100 focus-visible:ring-2 dark:bg-black/20 dark:hover:bg-black/60"
        onclick={close}
        type="button"
      >
        <Icon class="leading-none" name="close" />
      </button>
    </header>

    <div
      class="flex max-h-full flex-col overflow-y-auto p-6 will-change-scroll {className}"
    >
      {@render children?.()}
    </div>
  </dialog>
</Portal>
