<script lang="ts">
  import { Icon } from '@colibri-hq/ui';
  import type { CommentWithUserAndReactions } from '@colibri-hq/sdk/types';
  import CommentThread from '$lib/components/Comments/CommentThread.svelte';
  import CommentForm from '$lib/components/Comments/CommentForm.svelte';
  import CommentsSummary from '$lib/components/Comments/CommentsSummary.svelte';
  import ContentSection from '$lib/components/ContentSection.svelte';
  import { clickOutside } from '$lib/utilities';

  type EntityType = 'work' | 'creator' | 'publisher' | 'series' | 'collection';

  interface Props {
    loading?: boolean;
    comments: CommentWithUserAndReactions[];
    entityType: EntityType;
    entityId: string;
    moderationEnabled?: boolean;
    onReaction?: (event: { commentId: string; emoji: string }) => unknown;
    onReactionRemoved?: (event: { commentId: string; emoji: string }) => unknown;
    onOpen?: () => unknown;
    onClose?: () => unknown;
    onSubmit?: (event: { content: string; reset: () => void }) => unknown;
    onRefresh?: () => Promise<void>;
  }

  let {
    loading = false,
    comments,
    entityType,
    entityId,
    moderationEnabled = false,
    onOpen,
    onClose,
    onReaction,
    onReactionRemoved,
    onSubmit,
    onRefresh,
  }: Props = $props();

  let expanded = $state(false);
  let commentList = $state<HTMLUListElement | undefined>();

  function toggle() {
    return expanded ? close() : open();
  }

  export function open() {
    expanded = true;
    onOpen?.();
  }

  function close() {
    expanded = false;
    onClose?.();
  }
</script>

<footer
  class="fixed right-0 bottom-0 mt-auto w-10/12 transition duration-100 ease-in z-10"
  class:translate-y-0={expanded}
  class:translate-y-[calc(100%_-_3.5rem)]={!expanded}
  onClickOutside={close}
  use:clickOutside
>
  <ContentSection class="relative h-full">
    <div
      class="rounded-3xl bg-gradient-to-br from-blue-950/75 to-blue-900/75 shadow-2xl shadow-blue-500/25
     dark:shadow-blue-500/10 backdrop-blur-3xl backdrop-saturate-200 -ml-1 mr-1"
    >
      <!-- Panel activator -->
      <button
        class="flex w-full cursor-pointer items-center justify-between rounded-t-[inherit] p-4
        text-white transition"
        class:pt-3={!expanded}
        onclick={toggle}
      >
        <span class="flex items-center">
          <span class="mr-4">
            <Icon class="text-2xl leading-none" name="forum" />
          </span>

          {#if loading}
            <span>Loading…</span>
          {:else}
            <CommentsSummary {comments} />
          {/if}
        </span>

        <Icon
          name={expanded ? 'keyboard_double_arrow_down' : 'keyboard_double_arrow_up'}
        />
      </button>

      <div
        class="mb-2 overflow-hidden rounded-3xl bg-gray-100 shadow-lg shadow-blue-900/25 dark:bg-gray-950
        dark:shadow-blue-700/10"
      >
        <div class="max-h-96 overflow-y-auto px-4 pt-4">
          {#if comments.length === 0}
            <div class="flex flex-col items-center justify-center py-8 text-center">
              <Icon class="mb-2 text-4xl text-gray-300 dark:text-gray-600" name="chat_bubble_outline" />
              <p class="text-gray-500 dark:text-gray-400">Be the first to comment!</p>
            </div>
          {:else}
            <ul bind:this={commentList} class="divide-y divide-gray-200 dark:divide-gray-800/75">
              {#each comments as comment (comment.id)}
                <li class="py-2">
                  <CommentThread
                    {comment}
                    {entityType}
                    {entityId}
                    {moderationEnabled}
                    {onReaction}
                    {onReactionRemoved}
                    {onRefresh}
                  />
                </li>
              {/each}
            </ul>
          {/if}

          <CommentForm
            class="sticky bottom-0 rounded-t-xl pb-0"
            disabled={loading}
            {onSubmit}
          />
        </div>
      </div>
    </div>
  </ContentSection>
</footer>
