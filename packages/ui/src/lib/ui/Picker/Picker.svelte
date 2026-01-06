<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Popover } from '../Popover/index.js';

  type Side = 'top' | 'bottom' | 'left' | 'right';
  type Align = 'start' | 'center' | 'end';

  interface Props {
    open?: boolean;
    trigger?: Snippet<[{ open: boolean; props: Record<string, unknown> }]>;
    children?: Snippet;
    class?: string;
    sideOffset?: number;
    collisionPadding?: number;
    side?: Side;
    align?: Align;
    mountTarget?: HTMLElement | null;
    onOpenChange?: (open: boolean) => void;
  }

  let {
    open = $bindable(false),
    trigger,
    children,
    class: className = '',
    sideOffset = 8,
    collisionPadding = 16,
    side = 'bottom',
    align = 'start',
    mountTarget,
    onOpenChange,
  }: Props = $props();

  // Note: mountTarget is no longer used with native popover API
  // Popovers always render in the top layer
</script>

<Popover
  bind:open
  {trigger}
  {sideOffset}
  {collisionPadding}
  {side}
  {align}
  {onOpenChange}
  class={className}
>
  {#if children}
    {@render children()}
  {/if}
</Popover>
