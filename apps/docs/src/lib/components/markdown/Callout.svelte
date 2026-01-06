<script lang="ts">
  import type { Snippet } from 'svelte';

  type CalloutType = 'note' | 'tip' | 'warning' | 'danger';

  type Props = {
    type?: CalloutType;
    title?: string;
    children: Snippet;
  };

  const { type = 'note', title, children }: Props = $props();

  const icons: Record<CalloutType, string> = {
    note: '💡',
    tip: '✅',
    warning: '⚠️',
    danger: '🚨',
  };

  const typeClasses: Record<CalloutType, string> = {
    note: 'callout-note',
    tip: 'callout-tip',
    warning: 'callout-warning',
    danger: 'callout-danger',
  };
</script>

<aside class="callout {typeClasses[type]}" role="note">
  <div class="callout-header">
    <span class="callout-icon">{icons[type]}</span>
    <span class="callout-title">{title}</span>
  </div>
  <div class="callout-content">
    {@render children()}
  </div>
</aside>
