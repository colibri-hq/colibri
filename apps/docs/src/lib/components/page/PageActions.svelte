<script lang="ts">
  import { page } from '$app/state';
  import { Divider, OverflowButton } from '@colibri-hq/ui';
  import Claude from '$lib/components/icons/Claude.svelte';
  import ChatGpt from '$lib/components/icons/ChatGpt.svelte';
  import Markdown from '$lib/components/icons/Markdown.svelte';
  import { BracesIcon, CheckIcon, CopyIcon } from '@lucide/svelte';
  import { browser } from '$app/environment';

  type Props = {
    class?: string;
    [key: string]: unknown;
  };

  const { class: className, ...rest }: Props = $props();

  let copied = $state(false);

  async function copyPageContent() {
    try {
      const article = document.querySelector('article');

      if (article) {
        const text = article.innerText;
        await navigator.clipboard.writeText(text);
        copied = true;

        setTimeout(() => (copied = false), 2_000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  const mdUrl = $derived(page.url.pathname.replace(/\/$/, '') + '.md');
  const jsonUrl = $derived(page.url.pathname.replace(/\/$/, '') + '.json');
  const encodedContent = $derived.by(() => {
    if (!browser) {
      return '';
    }

    const article = document.querySelector('article');

    if (article) {
      const text = article.innerText;

      // Truncate to reasonable length for URL (max ~2000 chars for URL safety)
      const truncated = text.length > 1800 ? text.substring(0, 1800) + '…' : text;

      return encodeURIComponent(truncated);
    }

    return encodeURIComponent(page.url.href);
  });

  const options = $derived([
    { id: 'view-md', title: 'View Markdown', href: mdUrl },
    { id: 'view-json', title: 'View JSON', href: jsonUrl },
    Divider,
    { id: 'chatgpt', title: 'Open in ChatGPT', href: `https://chatgpt.com/?q=${encodedContent}` },
    { id: 'claude', title: 'Open in Claude', href: `https://claude.ai/new?q=${encodedContent}` },
  ] as const);
</script>

<div class="{className} relative inline-flex" {...rest}>
  <OverflowButton onclick={copyPageContent} {options} align="end">
    {#snippet item({ id, title })}
      {#if id === 'view-md'}
        <Markdown />
      {:else if id === 'view-json'}
        <BracesIcon class="size-4 me-1" />
      {:else if id === 'chatgpt'}
        <ChatGpt />
      {:else if id === 'claude'}
        <Claude />
      {/if}
      <span>{title}</span>
    {/snippet}

    {#if copied}
      <CheckIcon class="size-4 text-green-500" />
      <span>Copied!</span>
    {:else}
      <CopyIcon class="size-4" />
      <span>Copy Page</span>
    {/if}
  </OverflowButton>
</div>
