<script lang="ts">
  import { page } from '$app/state';

  let status: number = $derived(page.status ?? 500);

  let message = $derived(page.error?.message);
</script>

<div class="flex min-h-screen items-start justify-center p-16">
  <article
    class="h-auto w-full max-w-3xl grow-0 rounded-lg border border-gray-200 bg-white p-8 pt-4 shadow-lg
    dark:border-gray-800 dark:bg-gray-900/75"
  >
    <header class="mb-8 flex flex-col gap-2 dark:text-gray-200">
      <h1 class="font-serif text-5xl font-medium">An error occurred</h1>
      <span class="font-serif text-2xl">{status}: {message}</span>
    </header>

    <p class="text-gray-700 dark:text-gray-400">
      Uh-oh, this shouldn't have happened.
    </p>
  </article>
</div>
