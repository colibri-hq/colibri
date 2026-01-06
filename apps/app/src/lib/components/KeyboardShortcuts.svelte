<script lang="ts">
  import { goto } from '$app/navigation';

  interface Props {
    onOpenNotifications?: () => void;
  }

  let { onOpenNotifications }: Props = $props();

  const shortcuts: Record<string, string | (() => void)> = {
    n: () => onOpenNotifications?.(),
    s: '/instance/settings',
    b: '/books',
    c: '/creators',
    p: '/publishers',
    d: '/discover/featured',
    h: '/help',
  };

  function handleKeydown(event: KeyboardEvent) {
    // Alt key (Option on macOS)
    if (!event.altKey) return;

    // Don't trigger in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    const key = event.key.toLowerCase();
    const action = shortcuts[key];

    if (action) {
      event.preventDefault();

      if (typeof action === 'function') {
        action();
      } else {
        goto(action);
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />
