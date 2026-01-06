<script lang="ts">
  import { trpc } from '$lib/trpc/client';
  import { removeFromQueue, type QueuedUpload } from '$lib/uploads';
  import { Button, Icon } from '@colibri-hq/ui';
  import { toast } from 'svelte-sonner';

  interface Props {
    item: QueuedUpload;
    toastId: string | number;
  }

  let { item, toastId }: Props = $props();
  let isLoading = $state(false);

  async function handleAction(action: 'skip' | 'create-work' | 'create-edition') {
    if (!item.pendingId) return;

    isLoading = true;
    try {
      await trpc({ fetch, url: new URL(window.location.href) }).books.confirmDuplicate.mutate({
        uploadId: item.id,
        pendingId: item.pendingId,
        action,
      });

      // Remove the toast
      toast.dismiss(toastId);

      // Remove the item from the queue (the SSE event will update the status)
      removeFromQueue(item.id);
    } catch (e) {
      console.error('Failed to confirm duplicate action:', e);
    } finally {
      isLoading = false;
    }
  }

  // Get description based on duplicate type
  const description = $derived.by(() => {
    const info = item.duplicateInfo;
    if (!info) return 'A similar book may already exist in your library.';

    switch (info.type) {
      case 'same-isbn':
        return `A book with the same ISBN already exists: "${info.existingEdition?.title}"`;
      case 'same-asin':
        return `A book with the same ASIN already exists: "${info.existingEdition?.title}"`;
      case 'similar-title':
        return `A book with a similar title exists: "${info.existingEdition?.title}" (${Math.round((info.confidence ?? 0) * 100)}% match)`;
      case 'different-format':
        return `This may be a different format of: "${info.existingEdition?.title}"`;
      default:
        return info.description ?? 'A similar book may already exist.';
    }
  });
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-start gap-2">
    <Icon name="content_copy" class="mt-0.5 text-amber-500 shrink-0" />
    <div class="flex flex-col gap-1">
      <span class="font-medium text-gray-900 dark:text-gray-100">
        Possible duplicate detected
      </span>
      <span class="text-sm text-gray-600 dark:text-gray-400">
        {item.name}
      </span>
      <span class="text-sm text-gray-500 dark:text-gray-500">
        {description}
      </span>
    </div>
  </div>

  <div class="flex gap-2 justify-end">
    <Button
      variant="ghost"
      size="small"
      onclick={() => handleAction('skip')}
      disabled={isLoading}
    >
      Skip
    </Button>

    {#if item.duplicateInfo?.existingWork}
      <Button
        variant="subtle"
        size="small"
        onclick={() => handleAction('create-edition')}
        disabled={isLoading}
      >
        Add as Edition
      </Button>
    {/if}

    <Button
      variant="primary"
      size="small"
      onclick={() => handleAction('create-work')}
      disabled={isLoading}
    >
      Create New
    </Button>
  </div>
</div>
