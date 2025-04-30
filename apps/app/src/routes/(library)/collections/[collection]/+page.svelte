<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import IconPicker from '$lib/components/IconPicker.svelte';
  import BookLink from '$lib/components/Links/BookLink.svelte';
  import { savable, trpc } from '$lib/trpc/client';
  import type { PageData } from './$types';
  import Sorting from './Sorting.svelte';
  import { page } from '$app/stores';
  import { Icon } from '@colibri-hq/ui';
  import CommentsPanel from '$lib/components/Comments/CommentsPanel.svelte';
  import { writable } from 'svelte/store';
  import type { RouterOutputs } from '$lib/trpc/router';
  import { onMount } from 'svelte';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let collection = $derived(data.collection);
  let books = $derived(data.books);
  let comments = writable<RouterOutputs['collections']['loadComments']>([]);

  onMount(() => {
    data.comments.then((items) => {
      comments.set(items);
      loading = false;
    });
  });

  let iconPickerOpen: boolean = $state(false);
  let loading: boolean = $state(true);

  function updateSorting({ field }: { field: string | number }) {
    console.log('Update sorting to', { field });
  }

  async function updateCollectionIcon({ value: icon }: { value: string }) {
    await trpc($page).collections.save.mutate(
      savable({
        id: collection.id,
        icon,
      }),
    );

    await invalidateAll();
  }

  async function refreshComments() {
    loading = true;

    try {
      const result = await trpc($page).collections.loadComments.query(
        $page.params.collection,
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
    loading = true;

    try {
      await trpc($page).collections.addComment.mutate({
        collection: $page.params.collection,
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
    await trpc($page).comments.addReaction.mutate({ commentId, emoji });
    await refreshComments();
  }

  async function removeReaction({
    commentId,
    emoji,
  }: {
    commentId: string;
    emoji: string;
  }) {
    await trpc($page).comments.removeReaction.mutate({ commentId, emoji });
    await refreshComments();
  }
</script>

<article class="relative flex min-h-full flex-col">
  <header class="mb-8 flex items-center justify-between">
    <IconPicker bind:open={iconPickerOpen} onChange={updateCollectionIcon}>
      {#snippet activator()}
        <div>
          <span
            class="flex size-12 items-center justify-center rounded-full bg-gray-200 p-2
                text-3xl leading-none dark:bg-gray-800"
          >
            {collection.emoji}
          </span>
        </div>
      {/snippet}
    </IconPicker>

    <div class="ml-4 flex flex-col">
      <h1
        class="font-serif text-4xl leading-none font-medium dark:text-gray-300"
      >
        {collection.name}
      </h1>

      <div class="mt-1 flex items-center space-x-2">
        {#if !collection.shared}
          <span
            class="cursor-help rounded-full border border-red-500 bg-red-400 px-2 pb-0.5 text-sm leading-none
          font-medium text-red-50 shadow shadow-red-300/25 select-none dark:border-transparent dark:bg-red-700/75 dark:text-red-200"
            title="This collection is private and only visible to you."
          >
            private
          </span>
        {/if}

        {#if collection.age_requirement}
          <span class="text-sm text-gray-500">
            {collection.age_requirement} years and older
          </span>
        {/if}
      </div>
    </div>

    <div class="actions ml-auto flex items-center space-x-2">
      <Sorting onChange={updateSorting} />

      <button
        class="dark:focus-visible::bg-gray-700 hidden rounded-md bg-transparent p-2 leading-none outline-0
        transition hover:bg-gray-200 focus-visible:bg-gray-200 focus-visible:ring-2
        md:block dark:hover:bg-gray-700"
      >
        <Icon class="" name="info" />
      </button>
    </div>
  </header>

  {#if collection.books?.length > 0}
    <ul class="grid grid-cols-2 gap-8 md:grid-cols-4 xl:grid-cols-6">
      {#each books as book, index (index)}
        <li class="contents">
          <BookLink
            book={book.book_id ?? book.id}
            title={book.title}
            edition={book.main_edition_id}
            blurhash={book.cover_blurhash}
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
        This collection doesn't contain any books yet.
      </h2>
      <p class="mt-2 dark:text-gray-300">
        To add books, click &raquo;Add to collection&laquo; on their detail
        pages or drag them here.
      </p>
    </div>
  {/if}

  <CommentsPanel
    comments={$comments}
    {loading}
    onReaction={addReaction}
    onReactionRemoved={removeReaction}
    onSubmit={addComment}
  />
</article>
