<script lang="ts">
  import { Icon } from '@colibri-hq/ui';
  import type { CommentWithUserAndReactions } from '@colibri-hq/sdk';
  import Comment from '$lib/components/Comments/Comment.svelte';
  import CommentForm from '$lib/components/Comments/CommentForm.svelte';
  import CommentsSummary from '$lib/components/Comments/CommentsSummary.svelte';
  import ContentSection from '$lib/components/ContentSection.svelte';
  import { clickOutside } from '$lib/utilities';

  interface Props {
    loading?: boolean;
    comments: CommentWithUserAndReactions[];
    onReaction?: (event: { commentId: string; emoji: string }) => unknown;
    onReactionRemoved?: (event: { commentId: string; emoji: string }) => unknown;
    onOpen?: () => unknown;
    onClose?: () => unknown;
    onSubmit?: (event: {
      content: string;
      reset: () => void;
    }) => unknown;
  }

  let {
    loading = false,
    comments,
    onOpen,
    onClose,
    onReaction,
    onReactionRemoved,
    onSubmit,
  }: Props = $props();
  // $: browser && internalComments.then(() => tick()).then(() => commentList.lastElementChild?.scrollIntoView({
  //   behavior: 'smooth'
  // }));

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
  class="fixed bottom-0 right-0 mt-auto w-4/5 transition duration-100 ease-in"
  class:translate-y-0={expanded}
  class:translate-y-[calc(100%_-_3.5rem)]={!expanded}
  onClickOutside={close}
  use:clickOutside
>
  <ContentSection class="relative h-full">
    <div
      class="rounded-3xl bg-gradient-to-br from-blue-950/75 to-blue-900/75 shadow-2xl
         shadow-blue-500/25 backdrop-blur-3xl backdrop-saturate-200 dark:shadow-blue-500/10"
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
            <span>Loading...</span>
          {:else}
            <CommentsSummary {comments} />
          {/if}
        </span>

        <Icon
          name={expanded
            ? 'keyboard_double_arrow_down'
            : 'keyboard_double_arrow_up'}
        />
      </button>

      <div
        class="mb-2 overflow-hidden rounded-3xl bg-gray-100 shadow-lg shadow-blue-900/25
           dark:bg-gray-950 dark:shadow-blue-700/10"
      >
        <div class="max-h-96 overflow-y-auto px-4 pt-4">
          <ul bind:this={commentList} class="divide-y dark:divide-gray-800/75">
            {#each comments as comment (comment.id)}
              <li class="py-2">
                <Comment {comment} {onReaction} {onReactionRemoved} />
              </li>
            {/each}
          </ul>

          <CommentForm
            class="sticky bottom-0 rounded-t-xl bg-gray-100 pb-4 dark:bg-gray-950"
            disabled={loading}
            {onSubmit}
          />
        </div>
      </div>
    </div>
  </ContentSection>
</footer>
