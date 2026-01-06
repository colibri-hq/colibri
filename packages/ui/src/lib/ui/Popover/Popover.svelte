<script lang="ts">
  import { onDestroy, type Snippet, untrack } from 'svelte';

  type Side = 'top' | 'bottom' | 'left' | 'right';
  type Align = 'start' | 'center' | 'end';

  interface Props {
    open?: boolean;
    trigger?: Snippet<[{ open: boolean; props: Record<string, unknown> }]>;
    children?: Snippet;
    side?: Side;
    align?: Align;
    sideOffset?: number;
    collisionPadding?: number;
    onOpenChange?: (open: boolean) => void;
    class?: string;
  }

  let {
    open = $bindable(false),
    trigger,
    children,
    side = 'bottom',
    align = 'start',
    sideOffset = 8,
    collisionPadding = 16,
    onOpenChange,
    class: className = '',
  }: Props = $props();

  let triggerElement: HTMLElement | null = $state(null);
  let popoverElement: HTMLElement | null = $state(null);
  let popoverId = $state(`popover-${Math.random().toString(36).slice(2)}`);

  // Update popover visibility and position
  $effect.pre(() => {
    if (popoverElement) {
      if (open) {
        popoverElement.showPopover();
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => updatePosition());
      } else if (popoverElement.matches(':popover-open')) {
        popoverElement.hidePopover();
      }
    }
  });

  // Handle popover toggle event (fired when popover is shown/hidden by browser)
  function handleToggle(event: ToggleEvent) {
    const newOpen = event.newState === 'open';
    if (newOpen !== open) {
      open = newOpen;
      untrack(() => onOpenChange?.(newOpen));
    }
  }

  // Handle trigger click
  function handleTriggerClick() {
    open = !open;
    onOpenChange?.(open);
  }

  // Handle escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      open = false;
      onOpenChange?.(false);
      event.stopImmediatePropagation();
    }
  }

  // Calculate popover position using manual positioning
  // Note: CSS anchor positioning is not widely supported yet, so we use manual calculation based on trigger
  // element position
  function updatePosition() {
    if (!popoverElement || !triggerElement || !open) {
      return;
    }

    const triggerRect = triggerElement.getBoundingClientRect();
    const popoverRect = popoverElement.getBoundingClientRect();

    let top = 0;
    let left = 0;

    // Calculate position based on side
    switch (side) {
      case 'top':
        top = triggerRect.top - popoverRect.height - sideOffset;
        break;
      case 'bottom':
        top = triggerRect.bottom + sideOffset;
        break;
      case 'left':
        left = triggerRect.left - popoverRect.width - sideOffset;
        break;
      case 'right':
        left = triggerRect.right + sideOffset;
        break;
    }

    // Calculate alignment
    if (side === 'top' || side === 'bottom') {
      switch (align) {
        case 'start':
          left = triggerRect.left;
          break;
        case 'center':
          left = triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2;
          break;
        case 'end':
          left = triggerRect.right - popoverRect.width;
          break;
      }
    } else {
      switch (align) {
        case 'start':
          top = triggerRect.top;
          break;
        case 'center':
          top = triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2;
          break;
        case 'end':
          top = triggerRect.bottom - popoverRect.height;
          break;
      }
    }

    // Apply collision padding
    const padding = collisionPadding;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Constrain to viewport
    left = Math.max(padding, Math.min(left, viewportWidth - popoverRect.width - padding));
    top = Math.max(padding, Math.min(top, viewportHeight - popoverRect.height - padding));

    popoverElement.style.position = 'fixed';
    popoverElement.style.top = `${top}px`;
    popoverElement.style.left = `${left}px`;
  }

  // Update position on scroll/resize
  $effect(() => {
    if (open && typeof window !== 'undefined') {
      window.addEventListener('scroll', updatePosition, { passive: true });
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  });

  onDestroy(() => {
    if (popoverElement?.matches(':popover-open')) {
      popoverElement.hidePopover();
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if trigger}
  <div
    bind:this={triggerElement}
    role="button"
    tabindex="0"
    onclick={handleTriggerClick}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTriggerClick();
      }
    }}
  >
    {@render trigger({
      open,
      props: {
        'aria-expanded': open,
        'aria-controls': popoverId,
      },
    })}
  </div>
{/if}

<div
  bind:this={popoverElement}
  id={popoverId}
  popover="auto"
  ontoggle={handleToggle}
  class={className}
>
  {#if children}
    {@render children()}
  {/if}
</div>
