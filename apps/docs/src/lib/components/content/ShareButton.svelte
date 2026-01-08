<script lang="ts">
  import { browser } from "$app/environment";
  import { Button } from "@colibri-hq/ui";
  import { ShareIcon } from "@lucide/svelte";

  type Props = {
    /** Title to share (defaults to document.title) */
    shareTitle?: string;
    /** URL to share (defaults to window.location.href) */
    shareUrl?: string;
    class?: string;
    [key: string]: unknown;
  };

  const { shareTitle, shareUrl, class: className, ...rest }: Props = $props();

  // Check if Web Share API is supported
  const canShare = $derived(browser && !!navigator.share);

  function share() {
    void navigator.share?.({
      title: shareTitle ?? document.title,
      url: shareUrl ?? window.location.href,
    });
  }
</script>

{#if canShare}
  <Button icon variant="subtle" onclick={share} title="Share page" class={className} {...rest}>
    <ShareIcon class="size-4" />
  </Button>
{/if}
