<script lang="ts">
  import type { CommentWithUser } from '@colibri-hq/sdk/types';
  import AvatarGroup from '$lib/components/AvatarGroup.svelte';
  import { uniqueBy } from '@colibri-hq/shared';

  interface Props {
    class?: string;
    comments: CommentWithUser[];
  }

  let { class: className = '', comments }: Props = $props();
  let amount = $derived(comments.length ?? 0);
  let commenters = $derived(
    uniqueBy(
      comments.map(({ user }) => user).filter((u): u is NonNullable<typeof u> => u !== null),
      'email',
    ),
  );
</script>

<div class="inline-flex items-center gap-2 leading-none {className}">
  <AvatarGroup users={commenters} />

  {#if amount === 0}
    <span>No Comments yet</span>
  {:else if amount === 1}
    <span>One Comment</span>
  {:else}
    <span>{amount} Comments</span>
  {/if}
</div>
