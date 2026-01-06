<script lang="ts">
  import Gravatar from 'svelte-gravatar';
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';
  import ReactionButton from '$lib/components/Comments/ReactionButton.svelte';
  import ReportCommentModal from '$lib/components/Comments/ReportCommentModal.svelte';
  import { Button, EmojiPicker, Icon, Markdown, TextareaField } from '@colibri-hq/ui';
  import { page } from '$app/state';
  import type { CommentWithUserAndReactions } from '@colibri-hq/sdk/types';
  import { success } from '$lib/notifications';

  dayjs.extend(relativeTime);

  // Extended comment type with moderation fields
  type ModeratableComment = CommentWithUserAndReactions & {
    hidden_at?: string | Date | null;
    hidden_by?: string | null;
    hidden_reason?: string | null;
  };

  interface Props {
    comment: ModeratableComment;
    isAdmin?: boolean;
    moderationEnabled?: boolean;
    onReaction?: (event: { commentId: string; emoji: string }) => unknown;
    onReactionRemoved?: (event: { commentId: string; emoji: string }) => unknown;
    onReply?: (event: { parentId: string }) => unknown;
    onEdit?: (event: { commentId: string; content: string }) => Promise<void>;
    onDelete?: (event: { commentId: string }) => Promise<void>;
    onRefresh?: () => Promise<void>;
  }

  let {
    comment,
    isAdmin = false,
    moderationEnabled = false,
    onReaction,
    onReactionRemoved,
    onReply,
    onEdit,
    onDelete,
    onRefresh,
  }: Props = $props();
  let activeUserId = $derived.by(() => page.data.user?.id);
  let createdAt = $derived.by(() => new Date(comment.created_at));
  let isEdited = $derived.by(() => {
    if (!comment.updated_at) {
      return false;
    }

    const created = new Date(comment.created_at).getTime();
    const updated = new Date(comment.updated_at).getTime();

    return updated > created;
  });
  let isOwner = $derived.by(() => comment.created_by?.id?.toString() === activeUserId);

  // Process content to convert @mentions to links and ||spoilers|| to <spoiler> tags
  // Supports @username and @"Full Name" formats
  let processedContent = $derived.by(() => {
    let result = comment.content;

    // Replace @mentions with Markdown links
    // Match @username or @"Full Name" patterns
    result = result.replace(
      /@(?:"([^"]+)"|([a-zA-Z0-9_-]+))/g,
      (_match: string, quotedName: string | undefined, simpleName: string | undefined) => {
        const name = quotedName || simpleName || '';
        // Encode the name for URL
        const encodedName = encodeURIComponent(name);
        return `**[@${name}](/users?search=${encodedName})**`;
      },
    );

    // Replace ||spoiler|| with <spoiler> tag for custom renderer
    result = result.replace(/\|\|([^|]+)\|\|/g, '<spoiler>$1</spoiler>');

    return result;
  });

  // Edit mode state
  let isEditing = $state(false);
  let editContent = $state(comment.content);
  let isSaving = $state(false);

  // Delete confirmation state
  let showDeleteConfirm = $state(false);
  let isDeleting = $state(false);

  // Report modal state
  let showReportModal = $state(false);

  // Check if comment is hidden
  let isHidden = $derived.by(() => !!comment.hidden_at);

  // Reaction type from comment
  type CommentReaction = (typeof comment.reactions)[number];
  type ReactionMap = Record<string, { emoji: string; count: number; created_at: Date }>;

  // Find the reaction of the active user
  let reaction = $state<string | undefined>(
    comment.reactions.find((r: CommentReaction) => r.user_id.toString() === activeUserId)
      ?.emoji,
  );

  // Transform the reactions from a list to a dictionary, counting the numbers for each emoji
  let reactions = $derived.by<ReactionMap>(() =>
    comment.reactions.reduce<ReactionMap>(
      (reactions: ReactionMap, { created_at, emoji }: CommentReaction) => {
        if (!(emoji in reactions)) {
          reactions[emoji] = {
            emoji: emoji,
            count: 0,
            created_at: new Date(created_at as string | Date),
          };
        }

        reactions[emoji]!.count++;

        return reactions;
      }, {}),
  );

  async function addReaction(event: { emoji: string }) {
    const commentId = comment.id;
    onReaction?.({ commentId, emoji: event.emoji });
  }

  function toggleReaction(emoji: string) {
    return async () => {
      reaction = reaction === emoji ? undefined : emoji;
      const commentId = comment.id;

      return reaction
        ? onReaction?.({ commentId, emoji })
        : onReactionRemoved?.({ commentId, emoji });
    };
  }

  function startEdit() {
    editContent = comment.content;
    isEditing = true;
  }

  function cancelEdit() {
    isEditing = false;
    editContent = comment.content;
  }

  async function saveEdit() {
    if (editContent.trim() === comment.content.trim()) {
      isEditing = false;
      return;
    }
    isSaving = true;
    try {
      await onEdit?.({ commentId: comment.id, content: editContent.trim() });
      isEditing = false;
    } finally {
      isSaving = false;
    }
  }

  function handleReply() {
    onReply?.({ parentId: comment.id });
  }

  async function executeDelete() {
    isDeleting = true;
    try {
      await onDelete?.({ commentId: comment.id });
      showDeleteConfirm = false;
    } finally {
      isDeleting = false;
    }
  }

  function handleReported() {
    success('Comment reported', { message: 'Thank you for your report. A moderator will review it.' });
    onRefresh?.();
  }
</script>

<!-- Hidden comment placeholder for non-admins -->
{#if isHidden && !isAdmin}
  <span
    class="flex items-center gap-2 justify-center rounded-lg bg-gray-200 p-3 text-center text-sm text-gray-500
    dark:bg-gray-800 dark:text-gray-400"
  >
    <Icon name="visibility_off" class="inline-block text-base" />
    <span>This comment has been hidden by a moderator.</span>
  </span>
{:else}
  <article
    class="group grid grid-cols-[2rem_auto] grid-rows-[auto_min-content_auto] gap-x-2"
    class:opacity-60={isHidden}
  >
    <aside aria-hidden="true" class="row-span-3">
      <Gravatar
        class="h-8 w-8 overflow-hidden rounded-full bg-gray-50"
        email={comment.created_by?.email}
      />
    </aside>

    <header class="col-start-2 flex items-baseline flex-wrap gap-1">
      <h3 class="font-serif leading-none font-medium">
        {comment.created_by?.name}
      </h3>

      <time class="text-xs text-gray-500" datetime={createdAt.toISOString()}>
        {dayjs(createdAt).fromNow()}
      </time>

      {#if isEdited}
        <span class="text-xs text-gray-400 italic">(edited)</span>
      {/if}

      {#if isHidden && isAdmin}
        <span
          class="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/50 dark:text-red-300">
          Hidden
        </span>
      {/if}
    </header>

    {#if isEditing}
      <div class="col-start-2 mt-1">
        <TextareaField
          bind:value={editContent}
          rows={3}
        />
        <div class="mt-2 flex gap-2">
          <Button variant="primary" size="small" onclick={saveEdit} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="ghost" size="small" onclick={cancelEdit} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </div>
    {:else}
      <div class="col-start-2">
        <Markdown
          source={processedContent}
          class="text-sm leading-relaxed text-gray-600 dark:text-gray-400"
        />
      </div>
    {/if}

    <footer class="col-start-2 mt-0.5 flex items-center justify-between">
      <ul class="flex items-center gap-1">
        {#each Object.entries(reactions) as [emoji, { count }] (emoji)}
          <li class="contents">
            <ReactionButton
              {emoji}
              {count}
              active={emoji === reaction}
              onClick={toggleReaction(emoji)}
            />
          </li>
        {/each}

        <li class="contents">
          <EmojiPicker onInput={addReaction}>
            {#snippet trigger({ props })}
              <button
                {...props}
                class="flex cursor-pointer items-center rounded-full bg-gray-200 px-1 py-0.5 opacity-0 transition
                outline-none group-focus-within/picker:opacity-100 group-focus-within/picker:ring
                group-hover:opacity-100 ring-gray-300 hover:ring focus-visible:ring active:ring-blue-700
                dark:bg-gray-800 dark:hover:bg-blue-950"
                aria-label="Add reaction"
                title="Add reaction"
              >
                <Icon name="add" class="text-lg leading-none" />
              </button>
            {/snippet}
          </EmojiPicker>
        </li>
      </ul>

      <!-- Action buttons -->
      <div class="flex items-center space-x-1 opacity-0 transition group-hover:opacity-100">
        {#if onReply}
          <button
            onclick={handleReply}
            class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
            aria-label="Reply"
            title="Reply"
          >
            <Icon name="reply" class="text-base" />
          </button>
        {/if}

        {#if isOwner && onEdit}
          <button
            onclick={startEdit}
            class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
            aria-label="Edit"
            title="Edit"
          >
            <Icon name="edit" class="text-base" />
          </button>
        {/if}

        {#if isOwner && onDelete}
          <button
            onclick={() => showDeleteConfirm = true}
            class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
            aria-label="Delete"
            title="Delete"
          >
            <Icon name="delete" class="text-base" />
          </button>
        {/if}

        {#if !isOwner && moderationEnabled}
          <button
            onclick={() => showReportModal = true}
            class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-orange-600 dark:hover:bg-gray-800"
            aria-label="Report"
            title="Report comment"
          >
            <Icon name="flag" class="text-base" />
          </button>
        {/if}
      </div>
    </footer>
  </article>
{/if}

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
    <div class="mx-4 max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
      <h3 class="mb-2 text-lg font-semibold">Delete comment?</h3>
      <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
        This will permanently delete this comment
        {#if comment.reply_count && comment.reply_count > 0} and all its replies{/if}. This action cannot be undone.
      </p>
      <div class="flex gap-2 justify-end">
        <Button variant="ghost" onclick={() => showDeleteConfirm = false} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="primary" onclick={executeDelete} disabled={isDeleting}
                class="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600">
          {isDeleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- Report Modal -->
<ReportCommentModal
  bind:open={showReportModal}
  commentId={comment.id}
  onClose={() => showReportModal = false}
  onReported={handleReported}
/>
