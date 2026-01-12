<script lang="ts">
  import { Icon } from '@colibri-hq/ui';
  import type { CommentWithUserAndReactions } from '@colibri-hq/sdk/types';
  import CommentThread from '$lib/components/Comments/CommentThread.svelte';
  import CommentForm from '$lib/components/Comments/CommentForm.svelte';
  import CommentsSummary from '$lib/components/Comments/CommentsSummary.svelte';
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
  let panelElement = $state<HTMLElement | undefined>();

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
  bind:this={panelElement}
  class="bottom-4 z-10"
  class:sticky={!expanded}
  class:w-full={!expanded}
  class:fixed={expanded}
  class:left-[16.67%]={expanded}
  class:sm:left-[33.33%]={expanded}
  class:lg:left-[25%]={expanded}
  class:xl:left-[16.67%]={expanded}
  class:right-2={expanded}
  onClickOutside={close}
  use:clickOutside
>
  <!-- Wrapper matches ContentSection: mx-auto w-full px-20 max-w-7xl -->
  <div class="mx-auto w-full max-w-7xl" class:px-20={expanded}>
    <div
      class="rounded-3xl bg-linear-to-br from-blue-950/75 to-blue-900/75 shadow-2xl
      shadow-blue-500/25 backdrop-blur-3xl backdrop-saturate-200 dark:shadow-blue-500/10"
    >
    <!-- Panel header/activator -->
    <button
      class="flex w-full cursor-pointer items-center justify-between rounded-t-[inherit] p-4 text-white transition"
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

    <!-- Expandable content area -->
    <div
      class="grid transition-[grid-template-rows] duration-200 ease-out"
      class:grid-rows-[0fr]={!expanded}
      class:grid-rows-[1fr]={expanded}
    >
      <div class="overflow-hidden">
        <div
          class="mb-2 rounded-3xl bg-gray-100 shadow-lg shadow-blue-900/25 dark:bg-gray-950
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
    </div>
    </div>
  </div>
</footer>
