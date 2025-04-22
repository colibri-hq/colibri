<script lang="ts">
  import ContentSection from '$lib/components/ContentSection.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<ContentSection padding>
  <header class="mb-8">
    <h1 class="text-6xl font-serif font-bold">
      {#if data.isAuthenticated}
        Continue reading
      {:else}
        Welcome to Colibri!
      {/if}
    </h1>
  </header>

  {#if !data.isAuthenticated}
    <div class="leading-relaxed text-lg max-w-5xl flex flex-col gap-2">
      <p>
        Colibri is a digital library that allows you to read and share books with your friends. You can upload your own
        books, browse the library, and discover new titles.
      </p>
      <p>
        To get started, create an account or log in to your existing account. Once you're logged in, you can start
        uploading books and exploring the library.
      </p>
    </div>
  {/if}
</ContentSection>
