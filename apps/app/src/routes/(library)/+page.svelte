<script lang="ts">
  import ContentSection from '$lib/components/ContentSection.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<ContentSection padding>
  <header class="mb-8">
    <h1 class="font-serif text-6xl font-bold">
      {#if data.isAuthenticated}
        Continue reading
      {:else}
        Welcome to Colibri!
      {/if}
    </h1>
  </header>

  {#if !data.isAuthenticated}
    <div class="flex max-w-5xl flex-col gap-2 text-lg leading-relaxed">
      <p>
        Colibri is a digital library that allows you to read and share books
        with your friends. You can upload your own books, browse the library,
        and discover new titles.
      </p>
      <p>
        To get started, create an account or log in to your existing account.
        Once you're logged in, you can start uploading books and exploring the
        library.
      </p>
    </div>
  {/if}
</ContentSection>
