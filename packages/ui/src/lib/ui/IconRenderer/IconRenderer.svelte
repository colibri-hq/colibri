<script lang="ts">
  import { parseIconUrn, isMdiIcon, isEmoji, isCustomIcon } from '@colibri-hq/sdk/client';
  import Icon from '../Icon/Icon.svelte';

  interface Props {
    /**
     * Icon URN string (e.g., `urn:colibri:icon:mdi:favorite`).
     * Also supports legacy values (raw MDI names or emoji characters).
     */
    icon: string | null | undefined;

    /**
     * CSS class to apply to the icon element.
     */
    class?: string;

    /**
     * Fallback MDI icon name to display if no icon is provided.
     */
    fallback?: string;

    /**
     * Whether to fill the icon (MDI icons only).
     */
    fill?: boolean;
  }

  let {
    icon,
    class: className = '',
    fallback,
    fill = false,
  }: Props = $props();

  let parsed = $derived(parseIconUrn(icon));
</script>

{#if isMdiIcon(parsed)}
  <Icon name={parsed.value} class={className} {fill} />
{:else if isEmoji(parsed)}
  <span class={className}>{parsed.value}</span>
{:else if isCustomIcon(parsed)}
  <img src={parsed.value} alt="" class={className} />
{:else if fallback}
  <Icon name={fallback} class={className} {fill} />
{/if}
