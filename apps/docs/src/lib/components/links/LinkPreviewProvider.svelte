<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getLinkPreviewData, type LinkPreviewData } from '$lib/utils/link-preview';
  import { setLinkPreviewContext } from './context';
  import LinkPreviewPopover from './LinkPreviewPopover.svelte';

  interface Props {
    children: Snippet;
  }

  const { children }: Props = $props();

  let popoverElement: HTMLElement | null = $state(null);
  let anchorElement: HTMLElement | null = $state(null);
  let previewData: LinkPreviewData | null = $state(null);
  let isOpen = $state(false);
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

  const HOVER_DELAY = 300;
  const SIDE_OFFSET = 8;
  const COLLISION_PADDING = 16;

  function showPreview(href: string, anchor: HTMLElement) {
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }

    hoverTimeout = setTimeout(() => {
      try {
        const data = getLinkPreviewData(href);
        if (data) {
          previewData = data;
          anchorElement = anchor;
          isOpen = true;
        }
      } catch (error) {
        // Silently fail - preview is a progressive enhancement
        console.warn('Failed to get link preview data:', error);
      }
    }, HOVER_DELAY);
  }

  function hidePreview() {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    isOpen = false;
  }

  // Update popover visibility
  $effect.pre(() => {
    if (popoverElement) {
      if (isOpen) {
        popoverElement.showPopover();
        requestAnimationFrame(() => updatePosition());
      } else if (popoverElement.matches(':popover-open')) {
        popoverElement.hidePopover();
      }
    }
  });

  // Calculate popover position
  function updatePosition() {
    if (!popoverElement || !anchorElement || !isOpen) {
      return;
    }

    const anchorRect = anchorElement.getBoundingClientRect();
    const popoverRect = popoverElement.getBoundingClientRect();

    // Position below the anchor, start-aligned
    let top = anchorRect.bottom + SIDE_OFFSET;
    let left = anchorRect.left;

    // Viewport constraints
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Flip to top if not enough space below
    if (top + popoverRect.height + COLLISION_PADDING > viewportHeight) {
      top = anchorRect.top - popoverRect.height - SIDE_OFFSET;
    }

    // Constrain horizontally
    left = Math.max(
      COLLISION_PADDING,
      Math.min(left, viewportWidth - popoverRect.width - COLLISION_PADDING)
    );

    // Constrain vertically
    top = Math.max(
      COLLISION_PADDING,
      Math.min(top, viewportHeight - popoverRect.height - COLLISION_PADDING)
    );

    popoverElement.style.position = 'fixed';
    popoverElement.style.top = `${top}px`;
    popoverElement.style.left = `${left}px`;
  }

  // Update position on scroll/resize
  $effect(() => {
    if (isOpen && typeof window !== 'undefined') {
      window.addEventListener('scroll', updatePosition, { passive: true, capture: true });
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, { capture: true });
        window.removeEventListener('resize', updatePosition);
      };
    }
  });

  // Handle escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      hidePreview();
    }
  }

  // Handle popover toggle event
  function handleToggle(event: ToggleEvent) {
    if (event.newState === 'closed') {
      isOpen = false;
    }
  }

  // Handle mouse entering the popover itself (keep it open)
  function handlePopoverMouseEnter() {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
  }

  // Handle mouse leaving the popover
  function handlePopoverMouseLeave() {
    hidePreview();
  }

  setLinkPreviewContext({
    showPreview,
    hidePreview,
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{@render children()}

<div
  bind:this={popoverElement}
  id="link-preview-popover"
  popover="manual"
  role="tooltip"
  class="link-preview-popover"
  ontoggle={handleToggle}
  onmouseenter={handlePopoverMouseEnter}
  onmouseleave={handlePopoverMouseLeave}
>
  <LinkPreviewPopover data={previewData} />
</div>
