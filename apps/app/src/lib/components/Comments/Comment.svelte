<script lang="ts">
  import Gravatar from 'svelte-gravatar';
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';
  import ReactionButton from '$lib/components/Comments/ReactionButton.svelte';
  import { Icon } from '@colibri-hq/ui';
  import { EmojiPicker, { type EmojiPickerInputEvent } } from '@colibri-hq/ui';
  import { page } from '$app/state';
  import type { CommentWithUserAndReactions } from '@colibri-hq/sdk';

  dayjs.extend(relativeTime);

  interface Props {
    comment: CommentWithUserAndReactions;
    onReaction?: (event: { commentId: string; emoji: string; }) => unknown;
    onReactionRemoved?: (event: { commentId: string; emoji: string; }) => unknown;
  }

  let { comment, onReaction, onReactionRemoved }: Props = $props();
  let activeUserId = $derived.by(() => page.data.user.id);
  let createdAt = $derived.by(() => new Date(comment.created_at));

  // Find the reaction of the active user
  let reaction = $state<string | undefined>(
    comment.reactions.find(({ user_id }) => user_id.toString() === activeUserId)
      ?.emoji,
  );

  // Transform the reactions from a list to a dictionary, counting the numbers for each emoji
  let reactions = $derived.by(() => comment.reactions.reduce<
      Record<
        string,
        {
          emoji: string;
          count: number;
          created_at: Date;
        }
      >
    >((reactions, { emoji, created_at }) => {
      if (!(emoji in reactions)) {
        reactions[emoji] = {
          emoji,
          count: 0,
          created_at: new Date(created_at),
        };
      }

      reactions[emoji].count++;

      return reactions;
    }, {}),
  );

  async function addReaction({ emoji }: EmojiPickerInputEvent) {
    const commentId = comment.id;

    onReaction?.({ commentId, emoji });
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
</script>

<article
  class="group grid grid-cols-[2rem_auto] grid-rows-[auto_min-content_auto] gap-x-2"
>
  <aside aria-hidden="true" class="row-span-3">
    <Gravatar
      class="h-8 w-8 overflow-hidden rounded-full bg-gray-50"
      email={comment.created_by?.email}
    />
  </aside>

  <header class="col-start-2 flex items-baseline">
    <h3 class="font-serif font-medium leading-none">
      {comment.created_by?.name}
    </h3>

    <time class="ml-2 text-xs text-gray-500" datetime={createdAt.toISOString()}>
      {dayjs(createdAt).fromNow()}
    </time>
  </header>

  <p class="col-start-2 leading-relaxed text-gray-600 dark:text-gray-400">
    {comment.content}
  </p>

  <footer class="col-start-2 mt-0.5">
    <ul class="flex items-center space-x-1">
      {#each Object.entries(reactions) as [emoji, { count }] (emoji)}
        <li>
          <ReactionButton
            {emoji}
            {count}
            active={emoji === reaction}
            onClick={toggleReaction(emoji)}
          />
        </li>
      {/each}

      <li>
        <EmojiPicker onInput={addReaction}>
          {#snippet trigger()}
            <button
              class="flex cursor-pointer items-center rounded-full bg-gray-200 px-1
              py-0.5 opacity-0 outline-none transition hover:ring
              focus-visible:ring active:ring-blue-700 group-focus-within/picker:opacity-100 group-focus-within/picker:ring group-hover:opacity-100
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
  </footer>
</article>
