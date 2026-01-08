<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getLinkPreviewContext } from '$lib/components/links';
  import { isInternalDocLink } from '$lib/utils/link-preview';

  type Props = {
    children: Snippet;
    href?: string;
    [key: string]: unknown;
  };

  const { children, href, ...rest }: Props = $props();

  const previewContext = getLinkPreviewContext();
  const isInternal = $derived(href ? isInternalDocLink(href) : false);

  // Check for touch device (disable previews on touch)
  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  function handleMouseEnter(event: MouseEvent) {
    if (isInternal && previewContext && href && !isTouchDevice) {
      previewContext.showPreview(href, event.currentTarget as HTMLElement);
    }
  }

  function handleMouseLeave() {
    if (previewContext) {
      previewContext.hidePreview();
    }
  }

  function handleFocus(event: FocusEvent) {
    if (isInternal && previewContext && href && !isTouchDevice) {
      previewContext.showPreview(href, event.currentTarget as HTMLElement);
    }
  }

  function handleBlur() {
    if (previewContext) {
      previewContext.hidePreview();
    }
  }
</script>

<a
  {...rest}
  {href}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onfocus={handleFocus}
  onblur={handleBlur}
  aria-describedby={isInternal ? 'link-preview-popover' : undefined}
  class="text-blue-600 dark:text-blue-400 underline-offset-2 decoration-2 decoration-blue-400 dark:decoration-blue-500 font-medium transition hover:underline hover:text-blue-700
  dark:hover:text-blue-400"
>
  {@render children()}
</a>
