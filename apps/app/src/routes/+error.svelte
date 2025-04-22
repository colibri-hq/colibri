<script lang="ts">
  import { page } from '$app/state';

  let status: number = $derived(page.status ?? 500);

  let message = $derived(page.error?.message);
</script>

<div class="min-h-screen flex items-start justify-center p-16">
  <article
    class="bg-white grow-0 h-auto dark:bg-gray-800 w-full max-w-3xl shadow-lg rounded-lg p-8 pt-4 border border-gray-200"
  >
    <header class="flex flex-col gap-2 mb-8">
      <h1 class="text-5xl font-serif font-medium">An error occurred</h1>
      <span class="text-2xl font-serif">{status}: {message}</span>
    </header>

    <p class="text-gray-700">Uh-oh, this shouldn't have happened.</p>
  </article>
</div>
