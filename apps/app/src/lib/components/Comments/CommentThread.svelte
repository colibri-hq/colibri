<script lang="ts">
  import Comment from './Comment.svelte';
  import CommentThread from './CommentThread.svelte';
  import CommentForm from './CommentForm.svelte';
  import type { CommentWithUserAndReactions } from '@colibri-hq/sdk/types';
  import { trpc } from '$lib/trpc/client';
  import { page } from '$app/state';
  import { Icon } from '@colibri-hq/ui';

  type EntityType = 'work' | 'creator' | 'publisher' | 'series' | 'collection';

  interface Props {
    comment: CommentWithUserAndReactions;
    depth?: number;
    entityType: EntityType;
    entityId: string;
    moderationEnabled?: boolean;
    onRefresh?: () => Promise<void>;
    onReaction?: (event: { commentId: string; emoji: string }) => unknown;
    onReactionRemoved?: (event: { commentId: string; emoji: string }) => unknown;
  }

  let {
    comment,
    depth = 0,
    entityType,
    entityId,
    moderationEnabled = false,
    onRefresh,
    onReaction,
    onReactionRemoved,
  }: Props = $props();

  let replies = $state<CommentWithUserAndReactions[]>([]);
  let showReplies = $state(false);
  let showReplyForm = $state(false);
  let loadingReplies = $state(false);

  // Indentation styling (max 4 levels visually)
  const maxIndent = 4;
  let indentLevel = $derived(Math.min(depth, maxIndent));
  let replyCount = $derived(Number(comment.reply_count) || 0);

  async function loadReplies() {
    if (loadingReplies) {
      return;
    }

    // Toggle off
    if (showReplies) {
      showReplies = false;

      return;
    }

    loadingReplies = true;

    try {
      replies = await trpc(page).comments.getReplies.query({
        parentId: comment.id,
      });
      showReplies = true;
    } finally {
      loadingReplies = false;
    }
  }

  function handleReply() {
    showReplyForm = true;
  }

  async function submitReply({ content, reset }: { content: string; reset: () => void }) {
    const client = trpc(page);
    await client.comments.add.mutate({
      entityType,
      entityId,
      content,
      parentId: comment.id,
    });
    reset();

    showReplyForm = false;

    // Reload replies to show new reply
    loadingReplies = true;

    try {
      replies = await client.comments.getReplies.query({
        parentId: comment.id,
      });
      showReplies = true;
    } finally {
      loadingReplies = false;
    }

    await onRefresh?.();
  }

  async function handleEdit({ commentId, content }: { commentId: string; content: string }) {
    await trpc(page).comments.update.mutate({ commentId, content });
    await onRefresh?.();
  }

  async function handleDelete({ commentId }: { commentId: string }) {
    await trpc(page).comments.delete.mutate({ commentId });
    await onRefresh?.();
  }
</script>

<div class="comment-thread">
  <div class={indentLevel > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4 dark:border-gray-700' : ''}>
    <Comment
      {comment}
      {moderationEnabled}
      {onReaction}
      {onReactionRemoved}
      onReply={handleReply}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />

    <!-- Reply count & toggle -->
    {#if replyCount > 0}
      <button
        onclick={loadReplies}
        class="mt-1 ml-10 flex items-center gap-1 text-sm text-blue-600 hover:underline"
        disabled={loadingReplies}
      >
        {#if loadingReplies}
          <Icon name="sync" class="animate-spin text-sm" />
          Loading…
        {:else if showReplies}
          <Icon name="expand_less" class="text-sm" />
          Hide {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        {:else}
          <Icon name="expand_more" class="text-sm" />
          Show {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        {/if}
      </button>
    {/if}

    <!-- Inline reply form -->
    {#if showReplyForm}
      <div class="mt-2 ml-10">
        <CommentForm onSubmit={submitReply} />
        <button
          onclick={() => showReplyForm = false}
          class="mt-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Cancel
        </button>
      </div>
    {/if}

    <!-- Nested replies -->
    {#if showReplies && replies.length > 0}
      <ul class="mt-2 space-y-2">
        {#each replies as reply (reply.id)}
          <li class="contents">
            <CommentThread
              comment={reply}
              depth={depth + 1}
              {entityType}
              {entityId}
              {moderationEnabled}
              {onRefresh}
              {onReaction}
              {onReactionRemoved}
            />
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
