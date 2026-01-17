<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import WorkLink from '$lib/components/Links/WorkLink.svelte';
  import LikeButton from '$lib/components/LikeButton.svelte';
  import EditCollectionModal from '$lib/components/EditCollectionModal.svelte';
  import { savable, trpc } from '$lib/trpc/client';
  import type { PageProps } from './$types';
  import Sorting from './Sorting.svelte';
  import { page } from '$app/state';
  import { Icon, IconPicker, IconRenderer, Markdown } from '@colibri-hq/ui';
  import CommentsPanel from '$lib/components/Comments/CommentsPanel.svelte';
  import { writable } from 'svelte/store';
  import type { RouterOutputs } from '$lib/trpc/router';
  import { onMount } from 'svelte';

  let { data }: PageProps = $props();
  let collection = $derived(data.collection);
  let works = $derived(data.works);
  let comments = writable<RouterOutputs['collections']['loadComments']>([]);

  onMount(() => {
    data.comments.then((items) => {
      comments.set(items);
      loading = false;
    });
  });

  let iconPickerOpen: boolean = $state(false);
  let editModalOpen: boolean = $state(false);
  let loading: boolean = $state(true);
  let likeLoading: boolean = $state(false);
  let liked: boolean = $state(false);

  // Check if user has liked this collection
  onMount(async () => {
    const collectionId = page.params.collection;
    if (!collectionId) return;
    try {
      liked = await trpc(page).collections.isLiked.query(collectionId);
    } catch {
      // Ignore errors
    }
  });

  function updateSorting({ field }: { field: string | number | symbol }) {
    console.log('Update sorting to', { field });
  }

  async function updateCollectionIcon({ value: iconUrn }: { value: string }) {
    await trpc(page).collections.save.mutate(
      savable({
        id: collection.id,
        icon: iconUrn,
      }),
    );

    await invalidateAll();
  }

  async function toggleLike() {
    const collectionId = page.params.collection;
    if (!collectionId) return;
    likeLoading = true;
    try {
      const result = await trpc(page).collections.toggleLike.mutate(collectionId);
      liked = result.liked;
      await invalidateAll();
    } finally {
      likeLoading = false;
    }
  }

  async function handleDelete() {
    await goto('/collections');
  }

  async function refreshComments() {
    const collectionId = page.params.collection;
    if (!collectionId) return;
    loading = true;

    try {
      const result = await trpc(page).collections.loadComments.query(
        collectionId,
      );
      comments.set(result);
    } finally {
      loading = false;
    }
  }

  async function addComment({
                              content,
                              reset,
                            }: {
    content: string;
    reset: () => void;
  }) {
    const collectionId = page.params.collection;
    if (!collectionId) return;
    loading = true;

    try {
      await trpc(page).collections.addComment.mutate({
        collection: collectionId,
        content,
      });
      await refreshComments();

      // Reset the comment form
      reset();
    } finally {
      loading = false;
    }
  }

  async function addReaction({
                               commentId,
                               emoji,
                             }: {
    commentId: string;
    emoji: string;
  }) {
    await trpc(page).comments.addReaction.mutate({ commentId, emoji });
    await refreshComments();
  }

  async function removeReaction({
                                  commentId,
                                  emoji,
                                }: {
    commentId: string;
    emoji: string;
  }) {
    await trpc(page).comments.removeReaction.mutate({ commentId, emoji });
    await refreshComments();
  }

  // Convert color buffer to hex
  function bufferToHex(buffer: ArrayBuffer | null | undefined): string {
    if (!buffer) {
      return '';
    }
    const bytes = new Uint8Array(buffer);
    return '#' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  let colorHex = $derived(bufferToHex(collection?.color as ArrayBuffer | null | undefined));
</script>

{#if editModalOpen && collection}
  <EditCollectionModal
    bind:open={editModalOpen}
    collection={{
      ...collection,
      color: collection.color as ArrayBuffer | null | undefined
    }}
    onDelete={handleDelete}
  />
{/if}

{#if collection}
  <article class="relative flex min-h-full flex-col">
    <!-- eslint-disable svelte/no-inline-styles -- Dynamic colors from collection settings -->
    <header
      class="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 -m-4"
      style={colorHex ? `background-color: ${colorHex}15` : ''}
    >
      <div class="flex items-center gap-4">
        <IconPicker bind:open={iconPickerOpen} value={collection.icon ?? undefined} onInput={updateCollectionIcon}>
          {#snippet trigger({ props })}
            <button
              {...props}
              type="button"
              class="flex size-14 items-center justify-center rounded-full transition
              hover:scale-105 {colorHex ? '' : 'bg-gray-200 dark:bg-gray-800'}"
              style={colorHex ? `background-color: ${colorHex}30` : ''}
            >
              <IconRenderer icon={collection.icon} class="text-3xl" fallback="collections_bookmark" />
            </button>
          {/snippet}
        </IconPicker>
        <!-- eslint-enable svelte/no-inline-styles -->

        <div class="flex flex-col">
          <h1 class="font-serif text-4xl leading-none font-medium dark:text-gray-300">
            {collection.name}
          </h1>

          <div class="mt-1 flex flex-wrap items-center gap-2">
            {#if collection.shared === false}
              <span
                class="cursor-help rounded-full border border-amber-500 bg-amber-400 px-2 py-0.5 text-xs
                font-medium text-amber-900 select-none dark:border-transparent dark:bg-amber-700/75 dark:text-amber-200"
                title="This collection is private and only visible to you."
              >
                <Icon name="lock" class="mr-0.5 text-xs" />
                Private
              </span>
            {:else if collection.shared === true}
              <span
                class="cursor-help rounded-full border border-green-500 bg-green-400 px-2 py-0.5 text-xs
                font-medium text-green-900 select-none dark:border-transparent dark:bg-green-700/75 dark:text-green-200"
                title="This collection is public and visible to anyone."
              >
                <Icon name="public" class="mr-0.5 text-xs" />
                Public
              </span>
            {/if}

            {#if collection.age_requirement}
              <span
                class="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600
                dark:bg-gray-700 dark:text-gray-400"
              >
                {collection.age_requirement}+ years
              </span>
            {/if}
          </div>
        </div>
      </div>

      <div class="actions flex items-center gap-2">
        <LikeButton
          {liked}
          count={collection.like_count ?? 0}
          loading={likeLoading}
          onToggle={toggleLike}
        />

        <Sorting onChange={updateSorting} />

        <button
          class="rounded-md bg-transparent p-2 leading-none outline-0 transition
          hover:bg-gray-200 focus-visible:bg-gray-200 focus-visible:ring-2
          dark:hover:bg-gray-700 dark:focus-visible:bg-gray-700"
          onclick={() => (editModalOpen = true)}
          title="Edit collection"
        >
          <Icon name="edit" />
        </button>
      </div>
    </header>

    {#if collection.description}
      <div class="mb-6 prose prose-sm dark:prose-invert max-w-none">
        <Markdown source={collection.description} />
      </div>
    {/if}

    {#await works}
      <span>Loading...</span>
    {:then works}
      {#if works.length > 0}
        <ul class="grid grid-cols-2 gap-8 md:grid-cols-4 xl:grid-cols-6">
          {#each works as work, index (index)}
            <li class="contents">
              <WorkLink
                work={work.work_id ?? work.id}
                title={work.title ?? 'Untitled'}
                edition={work.main_edition_id ?? work.id}
                blurhash={work.cover_blurhash}
              />
            </li>
          {/each}
        </ul>
      {:else}
        <div
          class="empty-state flex flex-col items-center justify-center rounded-3xl bg-gray-100
          py-32 shadow-inner-sm dark:bg-gray-900"
        >
          <h2 class="font-serif text-3xl text-gray-500">
            This collection doesn't contain any works yet.
          </h2>
          <p class="mt-2 dark:text-gray-300">
            To add works, click "Add to collection" on their detail pages or drag them onto a collection in the sidebar.
          </p>
        </div>
      {/if}
    {/await}

    <CommentsPanel
      comments={$comments}
      entityType="collection"
      entityId={page.params.collection ?? ''}
      moderationEnabled={page.data.moderationEnabled}
      {loading}
      onReaction={addReaction}
      onReactionRemoved={removeReaction}
      onSubmit={addComment}
      onRefresh={refreshComments}
    />
  </article>
{/if}
